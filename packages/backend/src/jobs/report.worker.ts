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

interface GenerateReportData {
  tenantSchema: string;
  reportType: string;
  parameters: {
    startDate: string;
    endDate: string;
    accountIds?: string[];
    classId?: string;
    locationId?: string;
    customerId?: string;
    vendorId?: string;
    comparePreviousPeriod?: boolean;
  };
  format: 'pdf' | 'excel' | 'csv';
  requestedBy: string;
  deliveryMethod?: 'download' | 'email';
  recipientEmails?: string[];
}

interface ScheduledReportData {
  tenantSchema: string;
  scheduledReportId: string;
}

interface CleanupReportsData {
  retentionDays?: number;
}

interface ReportResult {
  headers: string[];
  rows: Array<Record<string, any>>;
  summary?: Record<string, any>;
}

// ------------------------------------------------------------------
// Main Job Processor
// ------------------------------------------------------------------

export async function processReportJob(job: Job): Promise<any> {
  logger.info(`Processing report job: ${job.name} (${job.id})`);

  switch (job.name) {
    case 'generate-report':
      return generateReport(job);
    case 'generate-scheduled':
      return generateScheduledReports(job);
    case 'export-report':
      return exportReport(job);
    case 'cleanup-old-reports':
      return cleanupOldReports(job);
    default:
      throw new Error(`Unknown report job name: ${job.name}`);
  }
}

// ------------------------------------------------------------------
// generate-report: Generate a report on demand
// ------------------------------------------------------------------

async function generateReport(job: Job<GenerateReportData>): Promise<{
  reportId: string;
  format: string;
  rowCount: number;
}> {
  const { tenantSchema, reportType, parameters, format, requestedBy, deliveryMethod, recipientEmails } = job.data;
  const db = getDatabase();

  try {
    await job.updateProgress(5);

    // Generate the report data based on type
    let reportResult: ReportResult;

    switch (reportType) {
      case 'profit-and-loss':
        reportResult = await generateProfitAndLoss(tenantSchema, parameters);
        break;
      case 'balance-sheet':
        reportResult = await generateBalanceSheet(tenantSchema, parameters);
        break;
      case 'trial-balance':
        reportResult = await generateTrialBalance(tenantSchema, parameters);
        break;
      case 'accounts-receivable-aging':
        reportResult = await generateARAgingReport(tenantSchema, parameters);
        break;
      case 'accounts-payable-aging':
        reportResult = await generateAPAgingReport(tenantSchema, parameters);
        break;
      case 'general-ledger':
        reportResult = await generateGeneralLedger(tenantSchema, parameters);
        break;
      case 'sales-by-customer':
        reportResult = await generateSalesByCustomer(tenantSchema, parameters);
        break;
      case 'expense-by-vendor':
        reportResult = await generateExpenseByVendor(tenantSchema, parameters);
        break;
      case 'tax-summary':
        reportResult = await generateTaxSummary(tenantSchema, parameters);
        break;
      default:
        throw new Error(`Unsupported report type: ${reportType}`);
    }

    await job.updateProgress(60);

    // Convert report data to the requested format
    let fileBuffer: Buffer;
    let contentType: string;
    let fileExtension: string;

    switch (format) {
      case 'csv':
        fileBuffer = convertToCsv(reportResult);
        contentType = 'text/csv';
        fileExtension = 'csv';
        break;
      case 'excel':
        fileBuffer = convertToExcel(reportResult, reportType);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        fileExtension = 'xlsx';
        break;
      case 'pdf':
      default:
        fileBuffer = convertToPdf(reportResult, reportType, parameters);
        contentType = 'application/pdf';
        fileExtension = 'pdf';
        break;
    }

    await job.updateProgress(80);

    // Store the generated report file reference
    const reportId = uuidv4();
    const storageKey = `reports/${tenantSchema}/${reportId}.${fileExtension}`;

    // In production, upload to S3:
    // await s3Client.upload({
    //   Bucket: config.s3.bucket,
    //   Key: storageKey,
    //   Body: fileBuffer,
    //   ContentType: contentType,
    // });

    // Store report metadata in attachments table
    await db.withSchema(tenantSchema).table('attachments').insert({
      id: reportId,
      entity_type: 'report',
      entity_id: reportId,
      file_name: `${reportType}-${parameters.startDate}-to-${parameters.endDate}.${fileExtension}`,
      file_type: contentType,
      file_size: fileBuffer.length,
      storage_key: storageKey,
      uploaded_by: requestedBy,
      created_at: new Date(),
    });

    // Create notification for the requester
    await db.withSchema(tenantSchema).table('notifications').insert({
      id: uuidv4(),
      user_id: requestedBy,
      type: 'report_ready',
      title: `Report Ready: ${formatReportTypeName(reportType)}`,
      message: `Your ${formatReportTypeName(reportType)} report for ${parameters.startDate} to ${parameters.endDate} is ready for download.`,
      link: `/reports/download/${reportId}`,
      is_read: false,
      created_at: new Date(),
    });

    // Send via email if requested
    if (deliveryMethod === 'email' && recipientEmails && recipientEmails.length > 0) {
      for (const email of recipientEmails) {
        await emailQueue.add('send-transactional', {
          tenantSchema,
          template: 'reportDeliveryEmail',
          to: email,
          subject: `Report: ${formatReportTypeName(reportType)}`,
          data: {
            recipientName: email.split('@')[0],
            reportName: formatReportTypeName(reportType),
            reportPeriod: `${parameters.startDate} to ${parameters.endDate}`,
            generatedAt: new Date().toISOString(),
            format: format.toUpperCase(),
            dashboardLink: `${config.app.url}/reports`,
          },
          attachments: [{
            filename: `${reportType}-${parameters.startDate}-to-${parameters.endDate}.${fileExtension}`,
            content: fileBuffer.toString('base64'),
            contentType,
          }],
        });
      }
    }

    await job.updateProgress(100);

    logger.info(`Report generated: type=${reportType}, format=${format}, rows=${reportResult.rows.length}`);
    return { reportId, format, rowCount: reportResult.rows.length };
  } catch (error) {
    logger.error(`Failed to generate report (type=${reportType}):`, error);
    throw error;
  }
}

// ------------------------------------------------------------------
// generate-scheduled: Process all scheduled reports due today
// ------------------------------------------------------------------

async function generateScheduledReports(job: Job<ScheduledReportData>): Promise<{
  processed: number;
}> {
  const db = getDatabase();
  const today = new Date().toISOString().split('T')[0];
  let processed = 0;

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
        const scheduledReports = await db.withSchema(schema).table('scheduled_reports')
          .where({ is_active: true })
          .where('next_run_date', '<=', today);

        for (const scheduled of scheduledReports) {
          try {
            const reportConfig = typeof scheduled.report_config === 'string'
              ? JSON.parse(scheduled.report_config)
              : scheduled.report_config;
            const recipients = typeof scheduled.recipients === 'string'
              ? JSON.parse(scheduled.recipients)
              : scheduled.recipients || [];

            // Calculate the report period based on frequency
            const period = calculateReportPeriod(scheduled.frequency);

            // Queue the report generation
            const { reportQueue } = await import('./index');
            await reportQueue.add('generate-report', {
              tenantSchema: schema,
              reportType: reportConfig.reportType,
              parameters: {
                ...reportConfig.parameters,
                startDate: period.startDate,
                endDate: period.endDate,
              },
              format: scheduled.format || 'pdf',
              requestedBy: scheduled.created_by,
              deliveryMethod: 'email',
              recipientEmails: recipients,
            });

            // Calculate and update the next run date
            const nextRunDate = calculateNextRunDate(scheduled.next_run_date, scheduled.frequency);
            await db.withSchema(schema).table('scheduled_reports')
              .where({ id: scheduled.id })
              .update({
                next_run_date: nextRunDate,
                updated_at: new Date(),
              });

            processed++;
            logger.info(
              `Scheduled report ${scheduled.id} queued for generation in schema ${schema}`,
            );
          } catch (reportError) {
            logger.error(
              `Failed to process scheduled report ${scheduled.id} in schema ${schema}:`,
              reportError,
            );
          }
        }
      } catch (schemaError) {
        logger.error(`Failed to process scheduled reports for schema ${schema}:`, schemaError);
      }
    }

    logger.info(`Scheduled report processing complete. Processed ${processed} reports.`);
    return { processed };
  } catch (error) {
    logger.error('Failed to process scheduled reports:', error);
    throw error;
  }
}

// ------------------------------------------------------------------
// export-report: Re-export an existing report in a different format
// ------------------------------------------------------------------

async function exportReport(job: Job<GenerateReportData>): Promise<{
  reportId: string;
  format: string;
}> {
  // Delegates to generateReport since the logic is the same
  return generateReport(job);
}

// ------------------------------------------------------------------
// cleanup-old-reports: Remove old generated report files
// ------------------------------------------------------------------

async function cleanupOldReports(job: Job<CleanupReportsData>): Promise<{
  deleted: number;
}> {
  const db = getDatabase();
  const retentionDays = job.data.retentionDays || 90;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  let totalDeleted = 0;

  try {
    const tenants = await db('public.tenants')
      .where({ is_active: true })
      .select('schema_name');

    for (const tenant of tenants) {
      try {
        const oldReports = await db.withSchema(tenant.schema_name).table('attachments')
          .where({ entity_type: 'report' })
          .where('created_at', '<', cutoffDate)
          .select('id', 'storage_key');

        if (oldReports.length === 0) {
          continue;
        }

        // In production, delete from S3:
        // for (const report of oldReports) {
        //   await s3Client.deleteObject({
        //     Bucket: config.s3.bucket,
        //     Key: report.storage_key,
        //   });
        // }

        // Delete metadata from database
        const reportIds = oldReports.map((r: any) => r.id);
        await db.withSchema(tenant.schema_name).table('attachments')
          .whereIn('id', reportIds)
          .delete();

        totalDeleted += oldReports.length;

        logger.info(
          `Cleaned up ${oldReports.length} old reports from schema ${tenant.schema_name}`,
        );
      } catch (schemaError) {
        logger.error(
          `Failed to clean up reports for schema ${tenant.schema_name}:`,
          schemaError,
        );
      }
    }

    logger.info(`Report cleanup complete. Deleted ${totalDeleted} old reports.`);
    return { deleted: totalDeleted };
  } catch (error) {
    logger.error('Failed to clean up old reports:', error);
    throw error;
  }
}

// ------------------------------------------------------------------
// Report Generation Functions
// ------------------------------------------------------------------

async function generateProfitAndLoss(
  tenantSchema: string,
  params: GenerateReportData['parameters'],
): Promise<ReportResult> {
  const db = getDatabase();

  // Fetch income accounts
  const incomeEntries = await db.withSchema(tenantSchema).table('journal_entry_lines')
    .join(`${tenantSchema}.journal_entries`, 'journal_entries.id', 'journal_entry_lines.journal_entry_id')
    .join(`${tenantSchema}.accounts`, 'accounts.id', 'journal_entry_lines.account_id')
    .where('accounts.type', 'income')
    .where('journal_entries.is_deleted', false)
    .whereBetween('journal_entries.date', [params.startDate, params.endDate])
    .select(
      'accounts.name as account_name',
      'accounts.account_number',
      db.raw('SUM(journal_entry_lines.credit_amount - journal_entry_lines.debit_amount) as total'),
    )
    .groupBy('accounts.id', 'accounts.name', 'accounts.account_number')
    .orderBy('accounts.account_number');

  // Fetch expense accounts
  const expenseEntries = await db.withSchema(tenantSchema).table('journal_entry_lines')
    .join(`${tenantSchema}.journal_entries`, 'journal_entries.id', 'journal_entry_lines.journal_entry_id')
    .join(`${tenantSchema}.accounts`, 'accounts.id', 'journal_entry_lines.account_id')
    .whereIn('accounts.type', ['expense', 'cost_of_goods_sold'])
    .where('journal_entries.is_deleted', false)
    .whereBetween('journal_entries.date', [params.startDate, params.endDate])
    .select(
      'accounts.name as account_name',
      'accounts.account_number',
      'accounts.type as account_type',
      db.raw('SUM(journal_entry_lines.debit_amount - journal_entry_lines.credit_amount) as total'),
    )
    .groupBy('accounts.id', 'accounts.name', 'accounts.account_number', 'accounts.type')
    .orderBy('accounts.account_number');

  const totalIncome = incomeEntries.reduce(
    (sum: Decimal, e: any) => sum.plus(new Decimal(e.total || 0)), new Decimal(0),
  );
  const totalExpenses = expenseEntries.reduce(
    (sum: Decimal, e: any) => sum.plus(new Decimal(e.total || 0)), new Decimal(0),
  );
  const netIncome = totalIncome.minus(totalExpenses);

  const rows: Array<Record<string, any>> = [];

  // Income section
  rows.push({ section: 'Income', account_number: '', account_name: 'INCOME', total: '' });
  for (const entry of incomeEntries) {
    rows.push({
      section: 'Income',
      account_number: entry.account_number || '',
      account_name: entry.account_name,
      total: new Decimal(entry.total || 0).toFixed(2),
    });
  }
  rows.push({ section: 'Income', account_number: '', account_name: 'Total Income', total: totalIncome.toFixed(2) });

  // Expense section
  rows.push({ section: 'Expenses', account_number: '', account_name: 'EXPENSES', total: '' });
  for (const entry of expenseEntries) {
    rows.push({
      section: 'Expenses',
      account_number: entry.account_number || '',
      account_name: entry.account_name,
      total: new Decimal(entry.total || 0).toFixed(2),
    });
  }
  rows.push({ section: 'Expenses', account_number: '', account_name: 'Total Expenses', total: totalExpenses.toFixed(2) });

  // Net income
  rows.push({ section: 'Summary', account_number: '', account_name: 'Net Income', total: netIncome.toFixed(2) });

  return {
    headers: ['Section', 'Account Number', 'Account Name', 'Total'],
    rows,
    summary: {
      totalIncome: totalIncome.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      netIncome: netIncome.toFixed(2),
    },
  };
}

async function generateBalanceSheet(
  tenantSchema: string,
  params: GenerateReportData['parameters'],
): Promise<ReportResult> {
  const db = getDatabase();

  const accountBalances = await db.withSchema(tenantSchema).table('journal_entry_lines')
    .join(`${tenantSchema}.journal_entries`, 'journal_entries.id', 'journal_entry_lines.journal_entry_id')
    .join(`${tenantSchema}.accounts`, 'accounts.id', 'journal_entry_lines.account_id')
    .whereIn('accounts.type', ['asset', 'liability', 'equity'])
    .where('journal_entries.is_deleted', false)
    .where('journal_entries.date', '<=', params.endDate)
    .select(
      'accounts.name as account_name',
      'accounts.account_number',
      'accounts.type as account_type',
      db.raw('SUM(journal_entry_lines.debit_amount - journal_entry_lines.credit_amount) as balance'),
    )
    .groupBy('accounts.id', 'accounts.name', 'accounts.account_number', 'accounts.type')
    .orderBy('accounts.type')
    .orderBy('accounts.account_number');

  const rows: Array<Record<string, any>> = [];
  let totalAssets = new Decimal(0);
  let totalLiabilities = new Decimal(0);
  let totalEquity = new Decimal(0);

  for (const account of accountBalances) {
    const balance = new Decimal(account.balance || 0);
    rows.push({
      account_type: account.account_type,
      account_number: account.account_number || '',
      account_name: account.account_name,
      balance: balance.toFixed(2),
    });

    if (account.account_type === 'asset') totalAssets = totalAssets.plus(balance);
    else if (account.account_type === 'liability') totalLiabilities = totalLiabilities.plus(balance.abs());
    else if (account.account_type === 'equity') totalEquity = totalEquity.plus(balance.abs());
  }

  return {
    headers: ['Account Type', 'Account Number', 'Account Name', 'Balance'],
    rows,
    summary: {
      totalAssets: totalAssets.toFixed(2),
      totalLiabilities: totalLiabilities.toFixed(2),
      totalEquity: totalEquity.toFixed(2),
      totalLiabilitiesAndEquity: totalLiabilities.plus(totalEquity).toFixed(2),
    },
  };
}

async function generateTrialBalance(
  tenantSchema: string,
  params: GenerateReportData['parameters'],
): Promise<ReportResult> {
  const db = getDatabase();

  const accounts = await db.withSchema(tenantSchema).table('journal_entry_lines')
    .join(`${tenantSchema}.journal_entries`, 'journal_entries.id', 'journal_entry_lines.journal_entry_id')
    .join(`${tenantSchema}.accounts`, 'accounts.id', 'journal_entry_lines.account_id')
    .where('journal_entries.is_deleted', false)
    .where('journal_entries.date', '<=', params.endDate)
    .select(
      'accounts.name as account_name',
      'accounts.account_number',
      'accounts.type as account_type',
      db.raw('SUM(journal_entry_lines.debit_amount) as total_debits'),
      db.raw('SUM(journal_entry_lines.credit_amount) as total_credits'),
    )
    .groupBy('accounts.id', 'accounts.name', 'accounts.account_number', 'accounts.type')
    .orderBy('accounts.account_number');

  let totalDebits = new Decimal(0);
  let totalCredits = new Decimal(0);

  const rows = accounts.map((account: any) => {
    const debits = new Decimal(account.total_debits || 0);
    const credits = new Decimal(account.total_credits || 0);
    totalDebits = totalDebits.plus(debits);
    totalCredits = totalCredits.plus(credits);

    return {
      account_number: account.account_number || '',
      account_name: account.account_name,
      account_type: account.account_type,
      debit: debits.toFixed(2),
      credit: credits.toFixed(2),
    };
  });

  return {
    headers: ['Account Number', 'Account Name', 'Account Type', 'Debit', 'Credit'],
    rows,
    summary: {
      totalDebits: totalDebits.toFixed(2),
      totalCredits: totalCredits.toFixed(2),
      difference: totalDebits.minus(totalCredits).toFixed(2),
    },
  };
}

async function generateARAgingReport(
  tenantSchema: string,
  _params: GenerateReportData['parameters'],
): Promise<ReportResult> {
  const db = getDatabase();
  const today = new Date();

  const openInvoices = await db.withSchema(tenantSchema).table('invoices')
    .leftJoin(`${tenantSchema}.customers`, 'customers.id', 'invoices.customer_id')
    .whereIn('invoices.status', ['sent', 'viewed', 'partially_paid', 'overdue'])
    .where({ 'invoices.is_deleted': false })
    .where('invoices.balance_due', '>', 0)
    .select(
      'invoices.id', 'invoices.invoice_number', 'invoices.due_date',
      'invoices.balance_due', 'invoices.customer_id',
      'customers.display_name as customer_name',
    );

  const rows = openInvoices.map((inv: any) => {
    const dueDate = new Date(inv.due_date);
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    const balance = new Decimal(inv.balance_due || 0);

    let agingBucket: string;
    if (daysOverdue <= 0) agingBucket = 'Current';
    else if (daysOverdue <= 30) agingBucket = '1-30 Days';
    else if (daysOverdue <= 60) agingBucket = '31-60 Days';
    else if (daysOverdue <= 90) agingBucket = '61-90 Days';
    else agingBucket = '90+ Days';

    return {
      customer_name: inv.customer_name,
      invoice_number: inv.invoice_number,
      due_date: inv.due_date,
      days_overdue: Math.max(0, daysOverdue),
      aging_bucket: agingBucket,
      balance_due: balance.toFixed(2),
    };
  });

  // Sort by customer name then days overdue
  rows.sort((a: any, b: any) => {
    const nameCompare = (a.customer_name || '').localeCompare(b.customer_name || '');
    if (nameCompare !== 0) return nameCompare;
    return b.days_overdue - a.days_overdue;
  });

  return {
    headers: ['Customer', 'Invoice #', 'Due Date', 'Days Overdue', 'Aging Bucket', 'Balance Due'],
    rows,
    summary: {
      totalOutstanding: rows.reduce(
        (sum: Decimal, r: any) => sum.plus(new Decimal(r.balance_due)), new Decimal(0),
      ).toFixed(2),
    },
  };
}

async function generateAPAgingReport(
  tenantSchema: string,
  _params: GenerateReportData['parameters'],
): Promise<ReportResult> {
  const db = getDatabase();
  const today = new Date();

  const openBills = await db.withSchema(tenantSchema).table('bills')
    .leftJoin(`${tenantSchema}.vendors`, 'vendors.id', 'bills.vendor_id')
    .whereIn('bills.status', ['open', 'partially_paid', 'overdue'])
    .where({ 'bills.is_deleted': false })
    .where('bills.balance_due', '>', 0)
    .select(
      'bills.id', 'bills.bill_number', 'bills.due_date',
      'bills.balance_due', 'bills.vendor_id',
      'vendors.display_name as vendor_name',
    );

  const rows = openBills.map((bill: any) => {
    const dueDate = new Date(bill.due_date);
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    const balance = new Decimal(bill.balance_due || 0);

    let agingBucket: string;
    if (daysOverdue <= 0) agingBucket = 'Current';
    else if (daysOverdue <= 30) agingBucket = '1-30 Days';
    else if (daysOverdue <= 60) agingBucket = '31-60 Days';
    else if (daysOverdue <= 90) agingBucket = '61-90 Days';
    else agingBucket = '90+ Days';

    return {
      vendor_name: bill.vendor_name,
      bill_number: bill.bill_number,
      due_date: bill.due_date,
      days_overdue: Math.max(0, daysOverdue),
      aging_bucket: agingBucket,
      balance_due: balance.toFixed(2),
    };
  });

  rows.sort((a: any, b: any) => {
    const nameCompare = (a.vendor_name || '').localeCompare(b.vendor_name || '');
    if (nameCompare !== 0) return nameCompare;
    return b.days_overdue - a.days_overdue;
  });

  return {
    headers: ['Vendor', 'Bill #', 'Due Date', 'Days Overdue', 'Aging Bucket', 'Balance Due'],
    rows,
    summary: {
      totalOutstanding: rows.reduce(
        (sum: Decimal, r: any) => sum.plus(new Decimal(r.balance_due)), new Decimal(0),
      ).toFixed(2),
    },
  };
}

async function generateGeneralLedger(
  tenantSchema: string,
  params: GenerateReportData['parameters'],
): Promise<ReportResult> {
  const db = getDatabase();

  let query = db.withSchema(tenantSchema).table('journal_entry_lines')
    .join(`${tenantSchema}.journal_entries`, 'journal_entries.id', 'journal_entry_lines.journal_entry_id')
    .join(`${tenantSchema}.accounts`, 'accounts.id', 'journal_entry_lines.account_id')
    .where('journal_entries.is_deleted', false)
    .whereBetween('journal_entries.date', [params.startDate, params.endDate])
    .select(
      'accounts.account_number', 'accounts.name as account_name',
      'journal_entries.date', 'journal_entries.entry_number',
      'journal_entries.memo',
      'journal_entry_lines.debit_amount', 'journal_entry_lines.credit_amount',
      'journal_entry_lines.description as line_description',
    )
    .orderBy('accounts.account_number')
    .orderBy('journal_entries.date');

  if (params.accountIds && params.accountIds.length > 0) {
    query = query.whereIn('journal_entry_lines.account_id', params.accountIds);
  }

  const entries = await query;

  const rows = entries.map((entry: any) => ({
    account_number: entry.account_number || '',
    account_name: entry.account_name,
    date: entry.date,
    entry_number: entry.entry_number,
    description: entry.line_description || entry.memo || '',
    debit: new Decimal(entry.debit_amount || 0).toFixed(2),
    credit: new Decimal(entry.credit_amount || 0).toFixed(2),
  }));

  return {
    headers: ['Account #', 'Account Name', 'Date', 'Entry #', 'Description', 'Debit', 'Credit'],
    rows,
  };
}

async function generateSalesByCustomer(
  tenantSchema: string,
  params: GenerateReportData['parameters'],
): Promise<ReportResult> {
  const db = getDatabase();

  const sales = await db.withSchema(tenantSchema).table('invoices')
    .leftJoin(`${tenantSchema}.customers`, 'customers.id', 'invoices.customer_id')
    .where({ 'invoices.is_deleted': false })
    .whereNotIn('invoices.status', ['draft', 'voided'])
    .whereBetween('invoices.invoice_date', [params.startDate, params.endDate])
    .select(
      'customers.display_name as customer_name',
      db.raw('COUNT(invoices.id) as invoice_count'),
      db.raw('SUM(invoices.total_amount) as total_sales'),
      db.raw('SUM(invoices.amount_paid) as total_paid'),
      db.raw('SUM(invoices.balance_due) as total_outstanding'),
    )
    .groupBy('customers.id', 'customers.display_name')
    .orderBy('total_sales', 'desc');

  const rows = sales.map((sale: any) => ({
    customer_name: sale.customer_name || 'Unknown Customer',
    invoice_count: sale.invoice_count,
    total_sales: new Decimal(sale.total_sales || 0).toFixed(2),
    total_paid: new Decimal(sale.total_paid || 0).toFixed(2),
    total_outstanding: new Decimal(sale.total_outstanding || 0).toFixed(2),
  }));

  return {
    headers: ['Customer', 'Invoices', 'Total Sales', 'Total Paid', 'Outstanding'],
    rows,
    summary: {
      totalSales: rows.reduce(
        (sum: Decimal, r: any) => sum.plus(new Decimal(r.total_sales)), new Decimal(0),
      ).toFixed(2),
    },
  };
}

async function generateExpenseByVendor(
  tenantSchema: string,
  params: GenerateReportData['parameters'],
): Promise<ReportResult> {
  const db = getDatabase();

  const expenses = await db.withSchema(tenantSchema).table('expenses')
    .leftJoin(`${tenantSchema}.vendors`, 'vendors.id', 'expenses.vendor_id')
    .where({ 'expenses.is_deleted': false })
    .whereBetween('expenses.date', [params.startDate, params.endDate])
    .select(
      'vendors.display_name as vendor_name',
      db.raw('COUNT(expenses.id) as expense_count'),
      db.raw('SUM(expenses.total_amount) as total_amount'),
    )
    .groupBy('vendors.id', 'vendors.display_name')
    .orderBy('total_amount', 'desc');

  const rows = expenses.map((expense: any) => ({
    vendor_name: expense.vendor_name || 'Uncategorized',
    expense_count: expense.expense_count,
    total_amount: new Decimal(expense.total_amount || 0).toFixed(2),
  }));

  return {
    headers: ['Vendor', 'Transactions', 'Total Amount'],
    rows,
    summary: {
      totalExpenses: rows.reduce(
        (sum: Decimal, r: any) => sum.plus(new Decimal(r.total_amount)), new Decimal(0),
      ).toFixed(2),
    },
  };
}

async function generateTaxSummary(
  tenantSchema: string,
  params: GenerateReportData['parameters'],
): Promise<ReportResult> {
  const db = getDatabase();

  // Output tax (from sales invoices)
  const outputTax = await db.withSchema(tenantSchema).table('invoices')
    .where({ is_deleted: false })
    .whereNotIn('status', ['draft', 'voided'])
    .whereBetween('invoice_date', [params.startDate, params.endDate])
    .select(
      db.raw('SUM(subtotal) as taxable_sales'),
      db.raw('SUM(tax_amount) as output_tax'),
    )
    .first();

  // Input tax (from bills)
  const inputTax = await db.withSchema(tenantSchema).table('bills')
    .where({ is_deleted: false })
    .whereNotIn('status', ['voided'])
    .whereBetween('bill_date', [params.startDate, params.endDate])
    .select(
      db.raw('SUM(subtotal) as taxable_purchases'),
      db.raw('SUM(tax_amount) as input_tax'),
    )
    .first();

  const outputTaxAmount = new Decimal(outputTax?.output_tax || 0);
  const inputTaxAmount = new Decimal(inputTax?.input_tax || 0);
  const netTax = outputTaxAmount.minus(inputTaxAmount);

  const rows = [
    {
      category: 'Output Tax (Sales)',
      taxable_amount: new Decimal(outputTax?.taxable_sales || 0).toFixed(2),
      tax_amount: outputTaxAmount.toFixed(2),
    },
    {
      category: 'Input Tax (Purchases)',
      taxable_amount: new Decimal(inputTax?.taxable_purchases || 0).toFixed(2),
      tax_amount: inputTaxAmount.toFixed(2),
    },
    {
      category: 'Net Tax Payable',
      taxable_amount: '',
      tax_amount: netTax.toFixed(2),
    },
  ];

  return {
    headers: ['Category', 'Taxable Amount', 'Tax Amount'],
    rows,
    summary: {
      outputTax: outputTaxAmount.toFixed(2),
      inputTax: inputTaxAmount.toFixed(2),
      netTax: netTax.toFixed(2),
    },
  };
}

// ------------------------------------------------------------------
// Format Conversion Helpers
// ------------------------------------------------------------------

function convertToCsv(report: ReportResult): Buffer {
  const lines: string[] = [];

  // Header row
  lines.push(report.headers.map(escapeCsvField).join(','));

  // Data rows
  for (const row of report.rows) {
    const values = report.headers.map((header) => {
      const key = header.toLowerCase().replace(/[^a-z0-9]/g, '_');
      return escapeCsvField(String(row[key] ?? ''));
    });
    lines.push(values.join(','));
  }

  return Buffer.from(lines.join('\n'), 'utf-8');
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function convertToExcel(report: ReportResult, _reportType: string): Buffer {
  // In production, use a library like exceljs or xlsx:
  //
  // const ExcelJS = require('exceljs');
  // const workbook = new ExcelJS.Workbook();
  // const sheet = workbook.addWorksheet(reportType);
  // sheet.addRow(report.headers);
  // for (const row of report.rows) {
  //   sheet.addRow(report.headers.map(h => row[h.toLowerCase().replace(/[^a-z0-9]/g, '_')]));
  // }
  // return workbook.xlsx.writeBuffer();

  // Fallback to CSV format until Excel library is integrated
  logger.info('Excel export falling back to CSV format - integrate exceljs for native xlsx support');
  return convertToCsv(report);
}

function convertToPdf(
  report: ReportResult,
  _reportType: string,
  _params: GenerateReportData['parameters'],
): Buffer {
  // In production, use Puppeteer or a PDF library:
  //
  // const browser = await puppeteer.launch();
  // const page = await browser.newPage();
  // await page.setContent(renderReportHtml(report, reportType, params));
  // const pdf = await page.pdf({ format: 'A4', margin: { top: '1cm', ... } });
  // await browser.close();
  // return pdf;

  // Fallback to CSV format until PDF library is integrated
  logger.info('PDF export falling back to CSV format - integrate puppeteer for native PDF support');
  return convertToCsv(report);
}

// ------------------------------------------------------------------
// Date/Period Helpers
// ------------------------------------------------------------------

function calculateReportPeriod(frequency: string): { startDate: string; endDate: string } {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  switch (frequency) {
    case 'daily':
      // Yesterday's data
      endDate = new Date(now);
      endDate.setDate(endDate.getDate() - 1);
      startDate = new Date(endDate);
      break;
    case 'weekly':
      // Last 7 days
      endDate = new Date(now);
      endDate.setDate(endDate.getDate() - 1);
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);
      break;
    case 'monthly':
      // Previous month
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      break;
    case 'quarterly':
      // Previous quarter
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const prevQuarterStart = (currentQuarter - 1) * 3;
      if (currentQuarter === 0) {
        startDate = new Date(now.getFullYear() - 1, 9, 1);
        endDate = new Date(now.getFullYear() - 1, 11, 31);
      } else {
        startDate = new Date(now.getFullYear(), prevQuarterStart, 1);
        endDate = new Date(now.getFullYear(), prevQuarterStart + 3, 0);
      }
      break;
    case 'annually':
      // Previous year
      startDate = new Date(now.getFullYear() - 1, 0, 1);
      endDate = new Date(now.getFullYear() - 1, 11, 31);
      break;
    default:
      // Default to last month
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

function calculateNextRunDate(currentDate: string | Date, frequency: string): string {
  const date = new Date(currentDate);

  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'annually':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      date.setMonth(date.getMonth() + 1);
  }

  return date.toISOString().split('T')[0];
}

function formatReportTypeName(reportType: string): string {
  const names: Record<string, string> = {
    'profit-and-loss': 'Profit & Loss',
    'balance-sheet': 'Balance Sheet',
    'trial-balance': 'Trial Balance',
    'accounts-receivable-aging': 'Accounts Receivable Aging',
    'accounts-payable-aging': 'Accounts Payable Aging',
    'general-ledger': 'General Ledger',
    'sales-by-customer': 'Sales by Customer',
    'expense-by-vendor': 'Expenses by Vendor',
    'tax-summary': 'Tax Summary',
  };

  return names[reportType] || reportType.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
