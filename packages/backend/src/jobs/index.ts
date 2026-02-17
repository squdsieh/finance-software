import { Queue, Worker, QueueEvents } from 'bullmq';
import { config } from '../config';
import { logger } from '../config/logger';
import { processInvoiceJob } from './invoice.worker';
import { processBankSyncJob } from './bank-sync.worker';
import { processEmailJob } from './email.worker';
import { processReportJob } from './report.worker';
import { processExchangeRateJob } from './exchange-rate.worker';
import { processReminderJob } from './reminder.worker';

// Redis connection configuration shared across all queues and workers
const connection = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null,
};

// Default job options applied to all queues
const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 2000,
  },
  removeOnComplete: {
    age: 86400, // Keep completed jobs for 24 hours
    count: 1000,
  },
  removeOnFail: {
    age: 604800, // Keep failed jobs for 7 days
  },
};

// ------------------------------------------------------------------
// Queue Definitions
// ------------------------------------------------------------------

export const invoiceQueue = new Queue('invoices', {
  connection,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 3,
  },
});

export const bankSyncQueue = new Queue('bank-sync', {
  connection,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

export const emailQueue = new Queue('emails', {
  connection,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
  },
});

export const reportQueue = new Queue('reports', {
  connection,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 2,
  },
});

export const exchangeRateQueue = new Queue('exchange-rates', {
  connection,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 4,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
  },
});

export const reminderQueue = new Queue('reminders', {
  connection,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 3,
  },
});

// ------------------------------------------------------------------
// Worker & QueueEvents tracking
// ------------------------------------------------------------------

const workers: Worker[] = [];
const queueEvents: QueueEvents[] = [];

/**
 * Creates a QueueEvents listener for a queue to provide centralized
 * logging of completed, failed, and stalled jobs.
 */
function createQueueEvents(queueName: string): QueueEvents {
  const events = new QueueEvents(queueName, { connection });

  events.on('completed', ({ jobId }) => {
    logger.debug(`Job ${jobId} in queue "${queueName}" completed`);
  });

  events.on('failed', ({ jobId, failedReason }) => {
    logger.error(`Job ${jobId} in queue "${queueName}" failed: ${failedReason}`);
  });

  events.on('stalled', ({ jobId }) => {
    logger.warn(`Job ${jobId} in queue "${queueName}" has stalled`);
  });

  return events;
}

/**
 * Initializes all BullMQ workers for background job processing.
 * Each worker is configured with appropriate concurrency settings
 * based on the workload type.
 */
export function initializeWorkers(): void {
  logger.info('Initializing background job workers...');

  // Invoice worker - moderate concurrency for mixed CPU/IO tasks
  const invoiceWorker = new Worker('invoices', processInvoiceJob, {
    connection,
    concurrency: 5,
    limiter: {
      max: 20,
      duration: 60000,
    },
  });
  workers.push(invoiceWorker);
  queueEvents.push(createQueueEvents('invoices'));

  // Bank sync worker - low concurrency due to external API rate limits
  const bankSyncWorker = new Worker('bank-sync', processBankSyncJob, {
    connection,
    concurrency: 3,
    limiter: {
      max: 10,
      duration: 60000,
    },
  });
  workers.push(bankSyncWorker);
  queueEvents.push(createQueueEvents('bank-sync'));

  // Email worker - higher concurrency for throughput
  const emailWorker = new Worker('emails', processEmailJob, {
    connection,
    concurrency: 10,
    limiter: {
      max: 50,
      duration: 60000,
    },
  });
  workers.push(emailWorker);
  queueEvents.push(createQueueEvents('emails'));

  // Report worker - low concurrency, heavy CPU/memory
  const reportWorker = new Worker('reports', processReportJob, {
    connection,
    concurrency: 2,
    lockDuration: 300000, // 5-minute lock for long-running reports
  });
  workers.push(reportWorker);
  queueEvents.push(createQueueEvents('reports'));

  // Exchange rate worker - single concurrency, idempotent updates
  const exchangeRateWorker = new Worker('exchange-rates', processExchangeRateJob, {
    connection,
    concurrency: 1,
  });
  workers.push(exchangeRateWorker);
  queueEvents.push(createQueueEvents('exchange-rates'));

  // Reminder worker - moderate concurrency
  const reminderWorker = new Worker('reminders', processReminderJob, {
    connection,
    concurrency: 5,
    limiter: {
      max: 30,
      duration: 60000,
    },
  });
  workers.push(reminderWorker);
  queueEvents.push(createQueueEvents('reminders'));

  // Attach common error handlers to all workers
  for (const worker of workers) {
    worker.on('error', (error) => {
      logger.error(`Worker "${worker.name}" encountered an error:`, error);
    });

    worker.on('failed', (job, error) => {
      logger.error(
        `Job ${job?.id} (${job?.name}) in worker "${worker.name}" failed after ${job?.attemptsMade} attempts:`,
        error,
      );
    });

    worker.on('completed', (job) => {
      logger.info(`Job ${job.id} (${job.name}) in worker "${worker.name}" completed successfully`);
    });

    worker.on('stalled', (jobId) => {
      logger.warn(`Job ${jobId} in worker "${worker.name}" has stalled and will be re-processed`);
    });
  }

  logger.info(`Initialized ${workers.length} background job workers`);
}

/**
 * Gracefully shuts down all workers and queue event listeners.
 * Waits for active jobs to finish before closing connections.
 */
export async function shutdownWorkers(): Promise<void> {
  logger.info('Shutting down background job workers...');

  const shutdownPromises: Promise<void>[] = [];

  // Close all workers - waits for running jobs to complete
  for (const worker of workers) {
    shutdownPromises.push(
      worker.close().then(() => {
        logger.info(`Worker "${worker.name}" shut down`);
      }).catch((error) => {
        logger.error(`Error shutting down worker "${worker.name}":`, error);
      }),
    );
  }

  // Close all queue event listeners
  for (const events of queueEvents) {
    shutdownPromises.push(
      events.close().catch((error) => {
        logger.error('Error closing queue events:', error);
      }),
    );
  }

  await Promise.all(shutdownPromises);

  // Close all queue connections
  const queues = [invoiceQueue, bankSyncQueue, emailQueue, reportQueue, exchangeRateQueue, reminderQueue];
  await Promise.all(
    queues.map((queue) =>
      queue.close().catch((error) => {
        logger.error(`Error closing queue "${queue.name}":`, error);
      }),
    ),
  );

  logger.info('All background job workers shut down successfully');
}

/**
 * Returns health status of all queues including job counts.
 * Useful for monitoring endpoints.
 */
export async function getQueueHealth(): Promise<Record<string, any>> {
  const queues = [
    { name: 'invoices', queue: invoiceQueue },
    { name: 'bank-sync', queue: bankSyncQueue },
    { name: 'emails', queue: emailQueue },
    { name: 'reports', queue: reportQueue },
    { name: 'exchange-rates', queue: exchangeRateQueue },
    { name: 'reminders', queue: reminderQueue },
  ];

  const health: Record<string, any> = {};

  for (const { name, queue } of queues) {
    try {
      const counts = await queue.getJobCounts('active', 'completed', 'delayed', 'failed', 'waiting');
      health[name] = {
        status: 'healthy',
        ...counts,
      };
    } catch (error) {
      health[name] = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  return health;
}
