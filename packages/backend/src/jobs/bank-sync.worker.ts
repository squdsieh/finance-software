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

interface FetchTransactionsData {
  tenantSchema: string;
  bankAccountId: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
}

interface AutoCategorizeData {
  tenantSchema: string;
  bankAccountId?: string;
  transactionIds?: string[];
}

interface MatchTransactionsData {
  tenantSchema: string;
  bankAccountId?: string;
  transactionIds?: string[];
}

interface SyncStatusNotificationData {
  tenantSchema: string;
  bankAccountId: string;
  userId: string;
  status: 'success' | 'partial' | 'failed';
  transactionsImported: number;
  transactionsMatched: number;
  errors?: string[];
}

interface PlaidTransaction {
  transaction_id: string;
  date: string;
  name: string;
  amount: number;
  category?: string[];
  merchant_name?: string;
  pending: boolean;
}

// ------------------------------------------------------------------
// Main Job Processor
// ------------------------------------------------------------------

export async function processBankSyncJob(job: Job): Promise<any> {
  logger.info(`Processing bank-sync job: ${job.name} (${job.id})`);

  switch (job.name) {
    case 'fetch-transactions':
      return fetchTransactions(job);
    case 'auto-categorize':
      return autoCategorize(job);
    case 'match-transactions':
      return matchTransactions(job);
    case 'sync-status-notification':
      return sendSyncStatusNotification(job);
    default:
      throw new Error(`Unknown bank-sync job name: ${job.name}`);
  }
}

// ------------------------------------------------------------------
// fetch-transactions: Pull transactions from bank via Plaid
// ------------------------------------------------------------------

async function fetchTransactions(job: Job<FetchTransactionsData>): Promise<{
  imported: number;
  duplicatesSkipped: number;
}> {
  const { tenantSchema, bankAccountId, startDate, endDate, userId } = job.data;
  const db = getDatabase();
  let imported = 0;
  let duplicatesSkipped = 0;

  try {
    // Fetch bank account details including Plaid credentials
    const bankAccount = await db.withSchema(tenantSchema).table('bank_accounts')
      .where({ id: bankAccountId, is_deleted: false })
      .first();

    if (!bankAccount) {
      throw new Error(`Bank account ${bankAccountId} not found in schema ${tenantSchema}`);
    }

    if (!bankAccount.is_connected || !bankAccount.plaid_item_id) {
      throw new Error(`Bank account ${bankAccountId} is not connected to a bank feed`);
    }

    // Determine date range for fetching
    const fetchStartDate = startDate
      || bankAccount.last_sync_at?.toISOString().split('T')[0]
      || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const fetchEndDate = endDate || new Date().toISOString().split('T')[0];

    await job.updateProgress(10);

    // Call Plaid API to fetch transactions
    const plaidTransactions = await fetchPlaidTransactions(
      bankAccount.plaid_item_id,
      bankAccount.plaid_account_id,
      fetchStartDate,
      fetchEndDate,
    );

    await job.updateProgress(40);

    // Get existing Plaid transaction IDs to detect duplicates
    const existingPlaidIds = await db.withSchema(tenantSchema).table('bank_transactions')
      .where({ bank_account_id: bankAccountId })
      .whereNotNull('plaid_transaction_id')
      .pluck('plaid_transaction_id');

    const existingIdSet = new Set(existingPlaidIds);

    // Process transactions in batches
    const batchSize = 50;
    const newTransactions: any[] = [];

    for (const plaidTxn of plaidTransactions) {
      if (existingIdSet.has(plaidTxn.transaction_id)) {
        duplicatesSkipped++;
        continue;
      }

      if (plaidTxn.pending) {
        continue; // Skip pending transactions
      }

      // Plaid amounts: positive = money out (debit), negative = money in (credit)
      const isCredit = plaidTxn.amount < 0;
      const amount = Math.abs(plaidTxn.amount);

      newTransactions.push({
        id: uuidv4(),
        bank_account_id: bankAccountId,
        date: plaidTxn.date,
        description: plaidTxn.merchant_name || plaidTxn.name,
        amount: amount.toFixed(2),
        type: isCredit ? 'credit' : 'debit',
        status: 'uncategorized',
        plaid_transaction_id: plaidTxn.transaction_id,
        memo: plaidTxn.category?.join(' > ') || null,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    // Insert in batches
    for (let i = 0; i < newTransactions.length; i += batchSize) {
      const batch = newTransactions.slice(i, i + batchSize);
      await db.withSchema(tenantSchema).table('bank_transactions').insert(batch);
      imported += batch.length;

      const progress = 40 + Math.floor((i / newTransactions.length) * 40);
      await job.updateProgress(progress);
    }

    // Update bank account sync timestamp and balance
    await db.withSchema(tenantSchema).table('bank_accounts')
      .where({ id: bankAccountId })
      .update({
        last_sync_at: new Date(),
        updated_at: new Date(),
      });

    await job.updateProgress(90);

    // Trigger auto-categorization for new transactions
    if (newTransactions.length > 0) {
      const { bankSyncQueue } = await import('./index');
      await bankSyncQueue.add('auto-categorize', {
        tenantSchema,
        bankAccountId,
        transactionIds: newTransactions.map((t) => t.id),
      });

      // Also trigger matching
      await bankSyncQueue.add('match-transactions', {
        tenantSchema,
        bankAccountId,
        transactionIds: newTransactions.map((t) => t.id),
      });
    }

    // Send sync notification
    if (userId) {
      const { bankSyncQueue } = await import('./index');
      await bankSyncQueue.add('sync-status-notification', {
        tenantSchema,
        bankAccountId,
        userId,
        status: 'success',
        transactionsImported: imported,
        transactionsMatched: 0,
      });
    }

    await job.updateProgress(100);

    logger.info(
      `Bank sync complete for account ${bankAccountId}: ${imported} imported, ${duplicatesSkipped} duplicates skipped`,
    );

    return { imported, duplicatesSkipped };
  } catch (error) {
    logger.error(`Failed to fetch bank transactions for account ${bankAccountId}:`, error);

    // Send failure notification
    if (userId) {
      const { bankSyncQueue } = await import('./index');
      await bankSyncQueue.add('sync-status-notification', {
        tenantSchema,
        bankAccountId,
        userId,
        status: 'failed',
        transactionsImported: imported,
        transactionsMatched: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      });
    }

    throw error;
  }
}

// ------------------------------------------------------------------
// auto-categorize: Apply bank rules to categorize transactions
// ------------------------------------------------------------------

async function autoCategorize(job: Job<AutoCategorizeData>): Promise<{
  categorized: number;
  skipped: number;
}> {
  const { tenantSchema, bankAccountId, transactionIds } = job.data;
  const db = getDatabase();
  let categorized = 0;
  let skipped = 0;

  try {
    // Load active bank rules ordered by priority
    const rules = await db.withSchema(tenantSchema).table('bank_rules')
      .where({ is_active: true })
      .orderBy('priority', 'asc');

    if (rules.length === 0) {
      logger.info(`No bank rules configured for schema ${tenantSchema}, skipping auto-categorization`);
      return { categorized: 0, skipped: 0 };
    }

    // Build query for uncategorized transactions
    let txnQuery = db.withSchema(tenantSchema).table('bank_transactions')
      .where({ status: 'uncategorized' });

    if (bankAccountId) {
      txnQuery = txnQuery.where({ bank_account_id: bankAccountId });
    }

    if (transactionIds && transactionIds.length > 0) {
      txnQuery = txnQuery.whereIn('id', transactionIds);
    }

    const transactions = await txnQuery;

    for (const txn of transactions) {
      let matched = false;

      for (const rule of rules) {
        const conditions = typeof rule.conditions === 'string'
          ? JSON.parse(rule.conditions)
          : rule.conditions;
        const actions = typeof rule.actions === 'string'
          ? JSON.parse(rule.actions)
          : rule.actions;

        if (evaluateRuleConditions(conditions, txn)) {
          // Apply rule actions
          const updates: Record<string, any> = {
            updated_at: new Date(),
          };

          if (actions.accountId) {
            updates.category_account_id = actions.accountId;
          }
          if (actions.vendorId) {
            updates.vendor_id = actions.vendorId;
          }
          if (actions.customerId) {
            updates.customer_id = actions.customerId;
          }
          if (actions.classId) {
            updates.class_id = actions.classId;
          }
          if (actions.locationId) {
            updates.location_id = actions.locationId;
          }

          // Set status based on auto_confirm setting
          updates.status = rule.auto_confirm ? 'categorized' : 'suggested';

          await db.withSchema(tenantSchema).table('bank_transactions')
            .where({ id: txn.id })
            .update(updates);

          categorized++;
          matched = true;
          break; // First matching rule wins
        }
      }

      if (!matched) {
        skipped++;
      }
    }

    logger.info(
      `Auto-categorization complete in schema ${tenantSchema}: ${categorized} categorized, ${skipped} unmatched`,
    );

    return { categorized, skipped };
  } catch (error) {
    logger.error(`Failed to auto-categorize transactions in schema ${tenantSchema}:`, error);
    throw error;
  }
}

// ------------------------------------------------------------------
// match-transactions: Match bank transactions with system records
// ------------------------------------------------------------------

async function matchTransactions(job: Job<MatchTransactionsData>): Promise<{
  matched: number;
  unmatched: number;
}> {
  const { tenantSchema, bankAccountId, transactionIds } = job.data;
  const db = getDatabase();
  let matched = 0;
  let unmatched = 0;

  try {
    // Get uncategorized/suggested transactions to attempt matching
    let txnQuery = db.withSchema(tenantSchema).table('bank_transactions')
      .whereIn('status', ['uncategorized', 'suggested']);

    if (bankAccountId) {
      txnQuery = txnQuery.where({ bank_account_id: bankAccountId });
    }

    if (transactionIds && transactionIds.length > 0) {
      txnQuery = txnQuery.whereIn('id', transactionIds);
    }

    const transactions = await txnQuery;

    for (const txn of transactions) {
      try {
        const txnAmount = new Decimal(txn.amount);
        const txnDate = txn.date;

        // Try to match credits with payments received
        if (txn.type === 'credit') {
          const matchingPayment = await db.withSchema(tenantSchema).table('payments_received')
            .where({ is_deleted: false, is_deposited: false })
            .where('amount', '=', txnAmount.toFixed(2))
            .whereBetween('payment_date', [
              shiftDate(txnDate, -3),
              shiftDate(txnDate, 3),
            ])
            .first();

          if (matchingPayment) {
            await db.withSchema(tenantSchema).table('bank_transactions')
              .where({ id: txn.id })
              .update({
                matched_transaction_id: matchingPayment.id,
                matched_transaction_type: 'payment_received',
                match_confidence: 'high',
                status: 'matched',
                customer_id: matchingPayment.customer_id,
                updated_at: new Date(),
              });
            matched++;
            continue;
          }
        }

        // Try to match debits with bill payments
        if (txn.type === 'debit') {
          const matchingBillPayment = await db.withSchema(tenantSchema).table('bill_payments')
            .where({ is_deleted: false })
            .where('amount', '=', txnAmount.toFixed(2))
            .whereBetween('payment_date', [
              shiftDate(txnDate, -3),
              shiftDate(txnDate, 3),
            ])
            .first();

          if (matchingBillPayment) {
            await db.withSchema(tenantSchema).table('bank_transactions')
              .where({ id: txn.id })
              .update({
                matched_transaction_id: matchingBillPayment.id,
                matched_transaction_type: 'bill_payment',
                match_confidence: 'high',
                status: 'matched',
                vendor_id: matchingBillPayment.vendor_id,
                updated_at: new Date(),
              });
            matched++;
            continue;
          }

          // Try to match with expenses
          const matchingExpense = await db.withSchema(tenantSchema).table('expenses')
            .where({ is_deleted: false })
            .where('total_amount', '=', txnAmount.toFixed(2))
            .whereBetween('date', [
              shiftDate(txnDate, -3),
              shiftDate(txnDate, 3),
            ])
            .first();

          if (matchingExpense) {
            await db.withSchema(tenantSchema).table('bank_transactions')
              .where({ id: txn.id })
              .update({
                matched_transaction_id: matchingExpense.id,
                matched_transaction_type: 'expense',
                match_confidence: 'medium',
                status: 'matched',
                vendor_id: matchingExpense.vendor_id,
                category_account_id: matchingExpense.payment_account_id,
                updated_at: new Date(),
              });
            matched++;
            continue;
          }
        }

        // Try fuzzy matching by description for invoices (credit transactions)
        if (txn.type === 'credit') {
          const potentialInvoice = await db.withSchema(tenantSchema).table('invoices')
            .whereIn('status', ['sent', 'viewed', 'partially_paid', 'overdue'])
            .where({ is_deleted: false })
            .where('balance_due', '=', txnAmount.toFixed(2))
            .first();

          if (potentialInvoice) {
            await db.withSchema(tenantSchema).table('bank_transactions')
              .where({ id: txn.id })
              .update({
                matched_transaction_id: potentialInvoice.id,
                matched_transaction_type: 'invoice',
                match_confidence: 'low',
                status: 'suggested',
                customer_id: potentialInvoice.customer_id,
                updated_at: new Date(),
              });
            matched++;
            continue;
          }
        }

        unmatched++;
      } catch (txnError) {
        logger.error(`Failed to match transaction ${txn.id}:`, txnError);
        unmatched++;
      }
    }

    logger.info(
      `Transaction matching complete in schema ${tenantSchema}: ${matched} matched, ${unmatched} unmatched`,
    );

    return { matched, unmatched };
  } catch (error) {
    logger.error(`Failed to match transactions in schema ${tenantSchema}:`, error);
    throw error;
  }
}

// ------------------------------------------------------------------
// sync-status-notification: Notify user of sync results
// ------------------------------------------------------------------

async function sendSyncStatusNotification(job: Job<SyncStatusNotificationData>): Promise<void> {
  const { tenantSchema, bankAccountId, userId, status, transactionsImported, errors } = job.data;
  const db = getDatabase();

  try {
    const bankAccount = await db.withSchema(tenantSchema).table('bank_accounts')
      .where({ id: bankAccountId })
      .first();

    const accountName = bankAccount?.name || 'Unknown Account';

    let title: string;
    let message: string;

    switch (status) {
      case 'success':
        title = `Bank sync completed - ${accountName}`;
        message = `Successfully imported ${transactionsImported} new transaction(s) from ${accountName}.`;
        break;
      case 'partial':
        title = `Bank sync partially completed - ${accountName}`;
        message = `Imported ${transactionsImported} transaction(s) from ${accountName}, but some errors occurred.`;
        break;
      case 'failed':
        title = `Bank sync failed - ${accountName}`;
        message = `Failed to sync transactions from ${accountName}. ${errors?.[0] || 'Please try again later.'}`;
        break;
    }

    // Create in-app notification
    await db.withSchema(tenantSchema).table('notifications').insert({
      id: uuidv4(),
      user_id: userId,
      type: 'bank_sync',
      title,
      message,
      link: `/banking/accounts/${bankAccountId}`,
      is_read: false,
      created_at: new Date(),
    });

    // Send email notification for failures
    if (status === 'failed') {
      const user = await db('public.users').where({ id: userId }).first();
      if (user?.email) {
        await emailQueue.add('send-transactional', {
          tenantSchema,
          template: 'bankSyncFailed',
          to: user.email,
          subject: `Bank Sync Failed - ${accountName}`,
          data: {
            firstName: user.first_name,
            accountName,
            errorMessage: errors?.[0] || 'An unexpected error occurred',
            dashboardLink: `${config.app.url}/banking/accounts/${bankAccountId}`,
          },
        });
      }
    }

    logger.info(`Sync status notification sent to user ${userId} for account ${bankAccountId}`);
  } catch (error) {
    logger.error(`Failed to send sync status notification:`, error);
    throw error;
  }
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/**
 * Fetches transactions from Plaid API.
 * This is a placeholder that simulates the Plaid /transactions/get endpoint.
 * In production, replace with actual Plaid SDK calls.
 */
async function fetchPlaidTransactions(
  _itemId: string,
  _accountId: string,
  _startDate: string,
  _endDate: string,
): Promise<PlaidTransaction[]> {
  // In production, this would use the Plaid SDK:
  //
  // const plaidClient = new PlaidApi(new Configuration({
  //   basePath: PlaidEnvironments[config.plaid.env],
  //   baseOptions: {
  //     headers: {
  //       'PLAID-CLIENT-ID': config.plaid.clientId,
  //       'PLAID-SECRET': config.plaid.secret,
  //     },
  //   },
  // }));
  //
  // const response = await plaidClient.transactionsGet({
  //   access_token: accessToken,
  //   start_date: startDate,
  //   end_date: endDate,
  //   options: { account_ids: [accountId], count: 500 },
  // });
  //
  // return response.data.transactions;

  logger.warn('Using Plaid placeholder - replace with actual Plaid SDK integration');

  if (!config.plaid.clientId || !config.plaid.secret) {
    throw new Error('Plaid credentials not configured. Set PLAID_CLIENT_ID and PLAID_SECRET environment variables.');
  }

  // Return empty array in sandbox/development mode
  return [];
}

/**
 * Evaluates bank rule conditions against a transaction.
 * Supports 'contains', 'equals', 'starts_with', 'ends_with',
 * 'greater_than', 'less_than' operators.
 */
function evaluateRuleConditions(
  conditions: Array<{
    field: string;
    operator: string;
    value: string;
  }>,
  transaction: Record<string, any>,
): boolean {
  if (!Array.isArray(conditions) || conditions.length === 0) {
    return false;
  }

  return conditions.every((condition) => {
    const fieldValue = String(transaction[condition.field] || '').toLowerCase();
    const conditionValue = String(condition.value || '').toLowerCase();

    switch (condition.operator) {
      case 'contains':
        return fieldValue.includes(conditionValue);
      case 'equals':
        return fieldValue === conditionValue;
      case 'starts_with':
        return fieldValue.startsWith(conditionValue);
      case 'ends_with':
        return fieldValue.endsWith(conditionValue);
      case 'greater_than':
        return parseFloat(fieldValue) > parseFloat(conditionValue);
      case 'less_than':
        return parseFloat(fieldValue) < parseFloat(conditionValue);
      case 'not_contains':
        return !fieldValue.includes(conditionValue);
      case 'not_equals':
        return fieldValue !== conditionValue;
      default:
        logger.warn(`Unknown rule condition operator: ${condition.operator}`);
        return false;
    }
  });
}

/**
 * Shifts a date string by the given number of days.
 */
function shiftDate(dateStr: string | Date, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}
