import { Job } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';
import { getDatabase } from '../database/connection';
import { config } from '../config';
import { logger } from '../config/logger';
import { emailQueue } from './index';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface ProcessRemindersData {
  tenantSchema?: string;
}

interface SendReminderData {
  tenantSchema: string;
  invoiceId: string;
  customerId: string;
  reminderStage: 'upcoming' | 'due_today' | 'overdue_gentle' | 'overdue_firm' | 'overdue_final';
  reminderConfigId?: string;
}

interface TrackReminderData {
  tenantSchema: string;
  invoiceId: string;
  customerId: string;
  reminderStage: string;
  deliveryStatus: 'sent' | 'failed' | 'bounced';
  emailAddress: string;
}

// ------------------------------------------------------------------
// Reminder Stage Configuration (defaults)
// ------------------------------------------------------------------

const DEFAULT_REMINDER_STAGES = [
  {
    stage: 'upcoming',
    daysOffset: -3, // 3 days before due date
    subject: 'Upcoming Payment Due - Invoice {{invoiceNumber}}',
    reminderType: 'friendly reminder',
  },
  {
    stage: 'due_today',
    daysOffset: 0, // On the due date
    subject: 'Payment Due Today - Invoice {{invoiceNumber}}',
    reminderType: 'reminder that payment is due today',
  },
  {
    stage: 'overdue_gentle',
    daysOffset: 7, // 7 days after due date
    subject: 'Payment Overdue - Invoice {{invoiceNumber}}',
    reminderType: 'gentle reminder about your overdue payment',
  },
  {
    stage: 'overdue_firm',
    daysOffset: 14, // 14 days after due date
    subject: 'Second Notice: Payment Overdue - Invoice {{invoiceNumber}}',
    reminderType: 'second notice regarding your overdue payment',
  },
  {
    stage: 'overdue_final',
    daysOffset: 30, // 30 days after due date
    subject: 'Final Notice: Payment Overdue - Invoice {{invoiceNumber}}',
    reminderType: 'final notice regarding your overdue payment',
  },
];

// ------------------------------------------------------------------
// Main Job Processor
// ------------------------------------------------------------------

export async function processReminderJob(job: Job): Promise<any> {
  logger.info(`Processing reminder job: ${job.name} (${job.id})`);

  switch (job.name) {
    case 'process-reminders':
      return processPaymentReminders(job);
    case 'send-reminder':
      return sendPaymentReminder(job);
    case 'track-reminder':
      return trackReminderHistory(job);
    default:
      throw new Error(`Unknown reminder job name: ${job.name}`);
  }
}

// ------------------------------------------------------------------
// process-reminders: Scan invoices and queue appropriate reminders
// ------------------------------------------------------------------

async function processPaymentReminders(job: Job<ProcessRemindersData>): Promise<{
  remindersQueued: number;
  tenantsProcessed: number;
}> {
  const db = getDatabase();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  let remindersQueued = 0;
  let tenantsProcessed = 0;

  try {
    const tenantSchemas: string[] = [];

    if (job.data.tenantSchema) {
      tenantSchemas.push(job.data.tenantSchema);
    } else {
      const tenants = await db('public.tenants')
        .where({ is_active: true })
        .select('schema_name');
      for (const t of tenants) {
        tenantSchemas.push(t.schema_name);
      }
    }

    for (const schema of tenantSchemas) {
      try {
        // Load tenant-specific reminder configuration
        const reminderConfigs = await db.withSchema(schema).table('payment_reminders')
          .where({ is_active: true })
          .orderBy('days_offset', 'asc');

        // Use tenant configs if available, otherwise use defaults
        const stages = reminderConfigs.length > 0
          ? reminderConfigs.map((rc: any) => ({
              id: rc.id,
              stage: rc.stage,
              daysOffset: rc.days_offset,
              subject: rc.email_template_subject,
              body: rc.email_template_body,
              reminderType: rc.stage.replace(/_/g, ' '),
            }))
          : DEFAULT_REMINDER_STAGES;

        // Find invoices that need reminders
        const openInvoices = await db.withSchema(schema).table('invoices')
          .leftJoin(`${schema}.customers`, 'customers.id', 'invoices.customer_id')
          .whereIn('invoices.status', ['sent', 'viewed', 'partially_paid', 'overdue'])
          .where({ 'invoices.is_deleted': false })
          .where('invoices.balance_due', '>', 0)
          .select(
            'invoices.id',
            'invoices.invoice_number',
            'invoices.due_date',
            'invoices.balance_due',
            'invoices.total_amount',
            'invoices.customer_id',
            'customers.display_name as customer_name',
            'customers.email as customer_email',
            'customers.preferred_delivery_method',
          );

        for (const invoice of openInvoices) {
          if (!invoice.customer_email) {
            continue; // Can't send reminder without email
          }

          // Determine which reminder stage applies based on days relative to due date
          const dueDate = new Date(invoice.due_date);
          const daysDiff = Math.floor(
            (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
          );

          for (const stage of stages) {
            // Check if this stage matches the current day relative to the due date
            // For upcoming reminders (negative offset): send when days until due matches
            // For overdue reminders (positive offset): send when days overdue matches
            if (daysDiff !== stage.daysOffset) {
              continue;
            }

            // Check if we've already sent this reminder stage for this invoice
            const alreadySent = await hasReminderBeenSent(
              schema,
              invoice.id,
              stage.stage,
              todayStr,
            );

            if (alreadySent) {
              continue;
            }

            // Respect customer delivery preferences
            if (invoice.preferred_delivery_method === 'none') {
              logger.info(
                `Skipping reminder for invoice ${invoice.invoice_number}: customer prefers no email`,
              );
              continue;
            }

            // Queue the reminder
            const { reminderQueue } = await import('./index');
            await reminderQueue.add('send-reminder', {
              tenantSchema: schema,
              invoiceId: invoice.id,
              customerId: invoice.customer_id,
              reminderStage: stage.stage,
              reminderConfigId: stage.id,
            });

            remindersQueued++;

            logger.debug(
              `Queued ${stage.stage} reminder for invoice ${invoice.invoice_number} ` +
              `(${daysDiff} days from due date)`,
            );
          }
        }

        tenantsProcessed++;
      } catch (schemaError) {
        logger.error(`Failed to process reminders for schema ${schema}:`, schemaError);
      }
    }

    logger.info(
      `Payment reminder processing complete: ${remindersQueued} reminders queued across ${tenantsProcessed} tenants`,
    );

    return { remindersQueued, tenantsProcessed };
  } catch (error) {
    logger.error('Failed to process payment reminders:', error);
    throw error;
  }
}

// ------------------------------------------------------------------
// send-reminder: Send a single payment reminder email
// ------------------------------------------------------------------

async function sendPaymentReminder(job: Job<SendReminderData>): Promise<{
  sent: boolean;
  reminderStage: string;
}> {
  const { tenantSchema, invoiceId, customerId, reminderStage, reminderConfigId } = job.data;
  const db = getDatabase();

  try {
    // Fetch invoice details
    const invoice = await db.withSchema(tenantSchema).table('invoices')
      .where({ id: invoiceId, is_deleted: false })
      .first();

    if (!invoice) {
      logger.warn(`Invoice ${invoiceId} not found, skipping reminder`);
      return { sent: false, reminderStage };
    }

    // Check if invoice has been paid since the reminder was queued
    if (invoice.status === 'paid' || invoice.status === 'voided') {
      logger.info(`Invoice ${invoice.invoice_number} is already ${invoice.status}, skipping reminder`);
      return { sent: false, reminderStage };
    }

    // Fetch customer details
    const customer = await db.withSchema(tenantSchema).table('customers')
      .where({ id: customerId })
      .first();

    if (!customer || !customer.email) {
      logger.warn(`Customer ${customerId} has no email, skipping reminder`);
      return { sent: false, reminderStage };
    }

    // Load custom template if configured
    let subject: string;
    let reminderType: string;

    if (reminderConfigId) {
      const reminderConfig = await db.withSchema(tenantSchema).table('payment_reminders')
        .where({ id: reminderConfigId })
        .first();

      if (reminderConfig) {
        subject = reminderConfig.email_template_subject || getDefaultSubject(reminderStage, invoice.invoice_number);
        reminderType = reminderConfig.stage.replace(/_/g, ' ');
      } else {
        subject = getDefaultSubject(reminderStage, invoice.invoice_number);
        reminderType = getReminderTypeLabel(reminderStage);
      }
    } else {
      subject = getDefaultSubject(reminderStage, invoice.invoice_number);
      reminderType = getReminderTypeLabel(reminderStage);
    }

    // Replace template variables in subject
    subject = subject
      .replace(/\{\{invoiceNumber\}\}/g, invoice.invoice_number)
      .replace(/\{\{customerName\}\}/g, customer.display_name)
      .replace(/\{\{amountDue\}\}/g, new Decimal(invoice.balance_due).toFixed(2));

    // Calculate days overdue
    const dueDate = new Date(invoice.due_date);
    const today = new Date();
    const daysOverdue = Math.max(
      0,
      Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)),
    );

    // Construct the payment link
    const paymentLink = invoice.online_payment_enabled
      ? `${config.app.url}/pay/${invoiceId}`
      : '';

    // Queue the email
    await emailQueue.add('send-transactional', {
      tenantSchema,
      template: 'paymentReminder',
      to: customer.email,
      subject,
      data: {
        customerName: customer.display_name,
        invoiceNumber: invoice.invoice_number,
        amountDue: new Decimal(invoice.balance_due).toFixed(2),
        totalAmount: new Decimal(invoice.total_amount).toFixed(2),
        dueDate: invoice.due_date,
        daysOverdue,
        reminderType,
        paymentLink,
        reminderStage,
        companyName: '', // Will be filled by the email worker
      },
    });

    // Track the reminder
    const { reminderQueue } = await import('./index');
    await reminderQueue.add('track-reminder', {
      tenantSchema,
      invoiceId,
      customerId,
      reminderStage,
      deliveryStatus: 'sent',
      emailAddress: customer.email,
    });

    // Create an in-app notification for the business owner
    await db.withSchema(tenantSchema).table('notifications').insert({
      id: uuidv4(),
      user_id: invoice.created_by || '00000000-0000-0000-0000-000000000000',
      type: 'payment_reminder_sent',
      title: `Payment reminder sent for ${invoice.invoice_number}`,
      message: `A ${reminderType} was sent to ${customer.display_name} (${customer.email}) ` +
        `for invoice ${invoice.invoice_number} - ${new Decimal(invoice.balance_due).toFixed(2)} due.`,
      link: `/invoices/${invoiceId}`,
      is_read: false,
      created_at: new Date(),
    });

    logger.info(
      `Payment reminder sent: stage=${reminderStage}, invoice=${invoice.invoice_number}, ` +
      `customer=${customer.display_name}, email=${customer.email}`,
    );

    return { sent: true, reminderStage };
  } catch (error) {
    logger.error(
      `Failed to send payment reminder for invoice ${invoiceId} (stage=${reminderStage}):`,
      error,
    );
    throw error;
  }
}

// ------------------------------------------------------------------
// track-reminder: Record reminder in history for deduplication
// ------------------------------------------------------------------

async function trackReminderHistory(job: Job<TrackReminderData>): Promise<void> {
  const { tenantSchema, invoiceId, customerId, reminderStage, deliveryStatus, emailAddress } = job.data;
  const db = getDatabase();

  try {
    // Store reminder history in the audit logs with a specific entity type
    await db.withSchema(tenantSchema).table('audit_logs').insert({
      id: uuidv4(),
      timestamp: new Date(),
      action: 'create',
      entity_type: 'payment_reminder',
      entity_id: invoiceId,
      changes: JSON.stringify([
        { field: 'reminder_stage', newValue: reminderStage },
        { field: 'delivery_status', newValue: deliveryStatus },
        { field: 'email_address', newValue: emailAddress },
        { field: 'customer_id', newValue: customerId },
      ]),
      metadata: JSON.stringify({
        reminderStage,
        deliveryStatus,
        emailAddress,
        sentAt: new Date().toISOString(),
      }),
    });

    // Update customer's last contact date
    await db.withSchema(tenantSchema).table('customers')
      .where({ id: customerId })
      .update({
        updated_at: new Date(),
      });

    logger.info(
      `Reminder history tracked: invoice=${invoiceId}, stage=${reminderStage}, status=${deliveryStatus}`,
    );
  } catch (error) {
    logger.error(`Failed to track reminder history for invoice ${invoiceId}:`, error);
    throw error;
  }
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/**
 * Checks if a reminder at the given stage has already been sent
 * for the specified invoice on the given date.
 */
async function hasReminderBeenSent(
  tenantSchema: string,
  invoiceId: string,
  stage: string,
  date: string,
): Promise<boolean> {
  const db = getDatabase();

  try {
    const existing = await db.withSchema(tenantSchema).table('audit_logs')
      .where({
        entity_type: 'payment_reminder',
        entity_id: invoiceId,
      })
      .whereRaw("metadata->>'reminderStage' = ?", [stage])
      .whereRaw("(metadata->>'sentAt')::date = ?::date", [date])
      .first();

    return !!existing;
  } catch (error) {
    // If the query fails (e.g., table doesn't exist), return false
    // to avoid blocking all reminders
    logger.warn(`Failed to check reminder history for invoice ${invoiceId}:`, error);
    return false;
  }
}

/**
 * Returns the default email subject for a reminder stage.
 */
function getDefaultSubject(stage: string, invoiceNumber: string): string {
  const subjects: Record<string, string> = {
    upcoming: `Upcoming Payment Due - Invoice ${invoiceNumber}`,
    due_today: `Payment Due Today - Invoice ${invoiceNumber}`,
    overdue_gentle: `Payment Reminder - Invoice ${invoiceNumber}`,
    overdue_firm: `Second Notice: Payment Overdue - Invoice ${invoiceNumber}`,
    overdue_final: `Final Notice: Immediate Payment Required - Invoice ${invoiceNumber}`,
  };

  return subjects[stage] || `Payment Reminder - Invoice ${invoiceNumber}`;
}

/**
 * Returns a human-readable label for the reminder type.
 */
function getReminderTypeLabel(stage: string): string {
  const labels: Record<string, string> = {
    upcoming: 'friendly reminder about your upcoming payment',
    due_today: 'reminder that your payment is due today',
    overdue_gentle: 'gentle reminder about your overdue payment',
    overdue_firm: 'second notice regarding your overdue payment',
    overdue_final: 'final notice regarding your overdue payment - immediate action required',
  };

  return labels[stage] || 'payment reminder';
}
