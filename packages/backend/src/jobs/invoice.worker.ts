import { Job } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';
import { getDatabase } from '../database/connection';
import { logger } from '../config/logger';
import { emailQueue } from './index';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface GenerateRecurringData {
  tenantSchema: string;
  templateId: string;
}

interface SendInvoiceEmailData {
  tenantSchema: string;
  invoiceId: string;
  recipientEmail: string;
  ccEmails?: string[];
  bccEmails?: string[];
  subject?: string;
  message?: string;
  attachPdf: boolean;
}

interface UpdateOverdueStatusData {
  tenantSchema?: string;
}

interface ApplyLateFeesData {
  tenantSchema?: string;
}

// ------------------------------------------------------------------
// Main Job Processor
// ------------------------------------------------------------------

export async function processInvoiceJob(job: Job): Promise<any> {
  logger.info(`Processing invoice job: ${job.name} (${job.id})`);

  switch (job.name) {
    case 'generate-recurring':
      return generateRecurringInvoices(job);
    case 'send-invoice-email':
      return sendInvoiceEmail(job);
    case 'update-overdue-status':
      return updateOverdueStatus(job);
    case 'apply-late-fees':
      return applyLateFees(job);
    default:
      throw new Error(`Unknown invoice job name: ${job.name}`);
  }
}

// ------------------------------------------------------------------
// generate-recurring: Create invoices from recurring templates
// ------------------------------------------------------------------

async function generateRecurringInvoices(job: Job<GenerateRecurringData>): Promise<{ generated: number }> {
  const db = getDatabase();
  const today = new Date().toISOString().split('T')[0];
  let generatedCount = 0;

  try {
    // If a specific template/schema is given, process just that one.
    // Otherwise, iterate over all active tenants (scheduled job).
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
        // Find templates due for generation
        let templateQuery = db.withSchema(schema).table('recurring_templates')
          .where({ template_type: 'invoice', is_paused: false })
          .where('next_generation_date', '<=', today)
          .where(function () {
            this.whereNull('end_date').orWhere('end_date', '>=', today);
          })
          .where(function () {
            this.whereNull('max_occurrences')
              .orWhereRaw('occurrences_generated < max_occurrences');
          });

        if (job.data.templateId) {
          templateQuery = templateQuery.where({ id: job.data.templateId });
        }

        const templates = await templateQuery;

        for (const template of templates) {
          try {
            const templateData = typeof template.template_data === 'string'
              ? JSON.parse(template.template_data)
              : template.template_data;

            const invoiceId = uuidv4();

            // Determine invoice number from tenant settings
            const tenant = await db('public.tenants')
              .whereRaw("schema_name = ?", [schema])
              .first();
            const settings = tenant?.settings || {};
            const prefix = settings.invoicePrefix || 'INV-';
            const nextNum = settings.invoiceNextNumber || 1;
            const invoiceNumber = `${prefix}${String(nextNum).padStart(4, '0')}`;

            // Calculate due date based on template configuration
            const daysUntilDue = template.days_before_due_date || 30;
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + daysUntilDue);

            // Calculate line item totals
            const lineItems = templateData.lineItems || [];
            let subtotal = new Decimal(0);
            let totalTax = new Decimal(0);

            const invoiceLines = lineItems.map((item: any, index: number) => {
              const qty = new Decimal(item.quantity || 1);
              const rate = new Decimal(item.unitRate || 0);
              const lineAmount = qty.times(rate);
              const lineTax = item.taxCodeId
                ? lineAmount.times(new Decimal('0.05'))
                : new Decimal(0);

              subtotal = subtotal.plus(lineAmount);
              totalTax = totalTax.plus(lineTax);

              return {
                id: uuidv4(),
                invoice_id: invoiceId,
                product_id: item.productId || null,
                description: item.description,
                quantity: item.quantity || 1,
                unit_rate: item.unitRate || 0,
                amount: lineAmount.toFixed(2),
                tax_code_id: item.taxCodeId || null,
                tax_amount: lineTax.toFixed(2),
                sort_order: index,
              };
            });

            // Calculate discount
            let discountAmount = new Decimal(0);
            if (templateData.discountType === 'percentage' && templateData.discountValue) {
              discountAmount = subtotal.times(new Decimal(templateData.discountValue)).dividedBy(100);
            } else if (templateData.discountType === 'fixed' && templateData.discountValue) {
              discountAmount = new Decimal(templateData.discountValue);
            }

            const totalAmount = subtotal.minus(discountAmount).plus(totalTax);

            await db.transaction(async (trx) => {
              // Insert the new invoice
              await trx.withSchema(schema).table('invoices').insert({
                id: invoiceId,
                invoice_number: invoiceNumber,
                customer_id: template.customer_id,
                invoice_date: today,
                due_date: dueDate.toISOString().split('T')[0],
                status: template.auto_send ? 'sent' : 'draft',
                currency: templateData.currency || 'AED',
                exchange_rate: templateData.exchangeRate || 1,
                subtotal: subtotal.toFixed(2),
                discount_type: templateData.discountType || null,
                discount_value: templateData.discountValue || null,
                discount_amount: discountAmount.toFixed(2),
                tax_amount: totalTax.toFixed(2),
                shipping_amount: templateData.shippingAmount || 0,
                total_amount: totalAmount.toFixed(2),
                amount_paid: 0,
                balance_due: totalAmount.toFixed(2),
                memo: templateData.memo,
                private_notes: `Auto-generated from recurring template ${template.id}`,
                online_payment_enabled: templateData.onlinePaymentEnabled !== false,
                recurring_template_id: template.id,
                project_id: templateData.projectId || null,
                class_id: templateData.classId || null,
                location_id: templateData.locationId || null,
                created_by: template.created_by,
                updated_by: template.created_by,
              });

              // Insert line items
              if (invoiceLines.length > 0) {
                await trx.withSchema(schema).table('invoice_line_items').insert(invoiceLines);
              }

              // Compute next generation date based on frequency
              const nextDate = computeNextGenerationDate(
                template.next_generation_date,
                template.frequency,
                template.day_of_month,
              );

              // Update recurring template
              await trx.withSchema(schema).table('recurring_templates')
                .where({ id: template.id })
                .update({
                  occurrences_generated: (template.occurrences_generated || 0) + 1,
                  next_generation_date: nextDate,
                  updated_at: new Date(),
                });

              // Update tenant invoice sequence number
              await trx('public.tenants')
                .whereRaw("schema_name = ?", [schema])
                .update({
                  settings: db.raw(`settings || '{"invoiceNextNumber": ${nextNum + 1}}'::jsonb`),
                });
            });

            generatedCount++;

            // If auto_send is enabled, queue an email job
            if (template.auto_send) {
              const customer = await db.withSchema(schema).table('customers')
                .where({ id: template.customer_id })
                .first();

              if (customer?.email) {
                await emailQueue.add('send-transactional', {
                  tenantSchema: schema,
                  template: 'invoiceEmail',
                  to: customer.email,
                  subject: `Invoice ${invoiceNumber}`,
                  data: {
                    customerName: customer.display_name,
                    invoiceNumber,
                    amountDue: totalAmount.toFixed(2),
                    dueDate: dueDate.toISOString().split('T')[0],
                    memo: templateData.memo || '',
                  },
                });
              }
            }

            logger.info(
              `Generated recurring invoice ${invoiceNumber} for template ${template.id} in schema ${schema}`,
            );
          } catch (templateError) {
            logger.error(
              `Failed to generate invoice from template ${template.id} in schema ${schema}:`,
              templateError,
            );
            // Continue processing other templates
          }
        }
      } catch (schemaError) {
        logger.error(`Failed to process recurring invoices for schema ${schema}:`, schemaError);
      }
    }

    logger.info(`Recurring invoice generation complete. Generated ${generatedCount} invoices.`);
    return { generated: generatedCount };
  } catch (error) {
    logger.error('Failed to generate recurring invoices:', error);
    throw error;
  }
}

// ------------------------------------------------------------------
// send-invoice-email: Send a single invoice via email
// ------------------------------------------------------------------

async function sendInvoiceEmail(job: Job<SendInvoiceEmailData>): Promise<{ sent: boolean }> {
  const { tenantSchema, invoiceId, recipientEmail, ccEmails, bccEmails, subject, message, attachPdf } = job.data;
  const db = getDatabase();

  try {
    const invoice = await db.withSchema(tenantSchema).table('invoices')
      .leftJoin(`${tenantSchema}.customers`, 'customers.id', 'invoices.customer_id')
      .where({ 'invoices.id': invoiceId })
      .select('invoices.*', 'customers.display_name as customer_name')
      .first();

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found in schema ${tenantSchema}`);
    }

    // Build the email job data
    const emailData: any = {
      tenantSchema,
      template: 'invoiceEmail',
      to: recipientEmail,
      cc: ccEmails,
      bcc: bccEmails,
      subject: subject || `Invoice ${invoice.invoice_number}`,
      data: {
        customerName: invoice.customer_name,
        invoiceNumber: invoice.invoice_number,
        amountDue: invoice.balance_due,
        dueDate: invoice.due_date,
        paymentLink: invoice.payment_link || '',
        memo: message || invoice.memo || '',
      },
    };

    // Attach PDF if requested
    if (attachPdf) {
      emailData.generatePdf = true;
      emailData.pdfEntityType = 'invoice';
      emailData.pdfEntityId = invoiceId;
    }

    // Enqueue the email
    await emailQueue.add('send-transactional', emailData);

    // Update invoice status and email tracking
    await db.withSchema(tenantSchema).table('invoices')
      .where({ id: invoiceId })
      .update({
        status: invoice.status === 'draft' ? 'sent' : invoice.status,
        email_status: 'sent',
        updated_at: new Date(),
      });

    logger.info(`Invoice email queued for ${invoice.invoice_number} to ${recipientEmail}`);
    return { sent: true };
  } catch (error) {
    logger.error(`Failed to send invoice email for ${invoiceId}:`, error);
    throw error;
  }
}

// ------------------------------------------------------------------
// update-overdue-status: Mark past-due invoices as overdue
// ------------------------------------------------------------------

async function updateOverdueStatus(job: Job<UpdateOverdueStatusData>): Promise<{ updated: number }> {
  const db = getDatabase();
  const today = new Date().toISOString().split('T')[0];
  let totalUpdated = 0;

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
        // Find invoices that are past due and not already overdue/paid/voided
        const overdueInvoices = await db.withSchema(schema).table('invoices')
          .where('due_date', '<', today)
          .whereIn('status', ['sent', 'viewed', 'partially_paid'])
          .where({ is_deleted: false })
          .where('balance_due', '>', 0)
          .select('id', 'invoice_number', 'customer_id', 'balance_due', 'due_date');

        if (overdueInvoices.length > 0) {
          const invoiceIds = overdueInvoices.map((inv: any) => inv.id);

          await db.withSchema(schema).table('invoices')
            .whereIn('id', invoiceIds)
            .update({
              status: 'overdue',
              updated_at: new Date(),
            });

          totalUpdated += overdueInvoices.length;

          // Create notifications for overdue invoices
          const notifications = overdueInvoices.map((inv: any) => {
            const daysPastDue = Math.floor(
              (new Date().getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24),
            );
            return {
              id: uuidv4(),
              user_id: inv.created_by || '00000000-0000-0000-0000-000000000000',
              type: 'invoice_overdue',
              title: `Invoice ${inv.invoice_number} is overdue`,
              message: `Invoice ${inv.invoice_number} is ${daysPastDue} day(s) past due. Balance: ${inv.balance_due}`,
              link: `/invoices/${inv.id}`,
              is_read: false,
              created_at: new Date(),
            };
          });

          // Insert notifications in batches to avoid hitting limits
          const batchSize = 100;
          for (let i = 0; i < notifications.length; i += batchSize) {
            const batch = notifications.slice(i, i + batchSize);
            await db.withSchema(schema).table('notifications').insert(batch);
          }

          logger.info(`Marked ${overdueInvoices.length} invoices as overdue in schema ${schema}`);
        }
      } catch (schemaError) {
        logger.error(`Failed to update overdue status for schema ${schema}:`, schemaError);
      }
    }

    // Update customer overdue balances
    for (const schema of tenantSchemas) {
      try {
        await db.withSchema(schema).table('customers')
          .update({
            overdue_balance: db.raw(`(
              SELECT COALESCE(SUM(balance_due), 0)
              FROM ${schema}.invoices
              WHERE invoices.customer_id = customers.id
                AND invoices.status = 'overdue'
                AND invoices.is_deleted = false
            )`),
            updated_at: new Date(),
          });
      } catch (err) {
        logger.error(`Failed to update customer overdue balances in schema ${schema}:`, err);
      }
    }

    logger.info(`Overdue status update complete. Updated ${totalUpdated} invoices across ${tenantSchemas.length} tenants.`);
    return { updated: totalUpdated };
  } catch (error) {
    logger.error('Failed to update overdue statuses:', error);
    throw error;
  }
}

// ------------------------------------------------------------------
// apply-late-fees: Add late fee charges to overdue invoices
// ------------------------------------------------------------------

async function applyLateFees(job: Job<ApplyLateFeesData>): Promise<{ applied: number }> {
  const db = getDatabase();
  let totalApplied = 0;

  try {
    const tenantSchemas: string[] = [];

    if (job.data.tenantSchema) {
      tenantSchemas.push(job.data.tenantSchema);
    } else {
      const tenants = await db('public.tenants')
        .where({ is_active: true })
        .select('schema_name', 'settings');
      for (const t of tenants) {
        tenantSchemas.push(t.schema_name);
      }
    }

    for (const schema of tenantSchemas) {
      try {
        // Get tenant settings for late fee configuration
        const tenant = await db('public.tenants')
          .whereRaw("schema_name = ?", [schema])
          .first();

        const settings = tenant?.settings || {};
        const lateFeeEnabled = settings.lateFeeEnabled === true;
        const lateFeeType = settings.lateFeeType || 'percentage'; // 'percentage' or 'fixed'
        const lateFeeValue = new Decimal(settings.lateFeeValue || '0');
        const lateFeeGraceDays = settings.lateFeeGraceDays || 0;

        if (!lateFeeEnabled || lateFeeValue.isZero()) {
          continue;
        }

        const graceCutoff = new Date();
        graceCutoff.setDate(graceCutoff.getDate() - lateFeeGraceDays);
        const graceCutoffStr = graceCutoff.toISOString().split('T')[0];

        // Find overdue invoices that haven't had a late fee applied today
        const overdueInvoices = await db.withSchema(schema).table('invoices')
          .where({ status: 'overdue', is_deleted: false })
          .where('due_date', '<', graceCutoffStr)
          .where('balance_due', '>', 0)
          .select('id', 'invoice_number', 'balance_due', 'total_amount', 'tax_amount',
            'subtotal', 'customer_id', 'created_by');

        for (const invoice of overdueInvoices) {
          try {
            // Check if a late fee line item was already added today
            const existingLateFee = await db.withSchema(schema).table('invoice_line_items')
              .where({ invoice_id: invoice.id })
              .where('description', 'like', '%Late fee%')
              .whereRaw("created_at::date = CURRENT_DATE")
              .first();

            if (existingLateFee) {
              continue; // Already applied today
            }

            // Calculate late fee amount
            let feeAmount: Decimal;
            if (lateFeeType === 'percentage') {
              feeAmount = new Decimal(invoice.balance_due).times(lateFeeValue).dividedBy(100);
            } else {
              feeAmount = lateFeeValue;
            }

            // Round to 2 decimal places
            feeAmount = new Decimal(feeAmount.toFixed(2));

            if (feeAmount.isZero()) {
              continue;
            }

            // Get max sort_order for existing line items
            const maxSort = await db.withSchema(schema).table('invoice_line_items')
              .where({ invoice_id: invoice.id })
              .max('sort_order as max_order')
              .first();

            const nextSortOrder = (maxSort?.max_order || 0) + 1;

            await db.transaction(async (trx) => {
              // Add late fee line item
              await trx.withSchema(schema).table('invoice_line_items').insert({
                id: uuidv4(),
                invoice_id: invoice.id,
                description: `Late fee - ${lateFeeType === 'percentage' ? `${lateFeeValue}%` : 'flat'} charge`,
                quantity: 1,
                unit_rate: feeAmount.toFixed(2),
                amount: feeAmount.toFixed(2),
                tax_amount: 0,
                sort_order: nextSortOrder,
              });

              // Update invoice totals
              const newSubtotal = new Decimal(invoice.subtotal).plus(feeAmount);
              const newTotal = new Decimal(invoice.total_amount).plus(feeAmount);
              const newBalance = new Decimal(invoice.balance_due).plus(feeAmount);

              await trx.withSchema(schema).table('invoices')
                .where({ id: invoice.id })
                .update({
                  subtotal: newSubtotal.toFixed(2),
                  total_amount: newTotal.toFixed(2),
                  balance_due: newBalance.toFixed(2),
                  updated_at: new Date(),
                });
            });

            totalApplied++;

            logger.info(
              `Applied late fee of ${feeAmount.toFixed(2)} to invoice ${invoice.invoice_number} in schema ${schema}`,
            );
          } catch (invoiceError) {
            logger.error(
              `Failed to apply late fee to invoice ${invoice.id} in schema ${schema}:`,
              invoiceError,
            );
          }
        }
      } catch (schemaError) {
        logger.error(`Failed to process late fees for schema ${schema}:`, schemaError);
      }
    }

    logger.info(`Late fee application complete. Applied ${totalApplied} late fees.`);
    return { applied: totalApplied };
  } catch (error) {
    logger.error('Failed to apply late fees:', error);
    throw error;
  }
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/**
 * Computes the next generation date for a recurring template based
 * on the configured frequency and optional day-of-month anchor.
 */
function computeNextGenerationDate(
  currentDate: string | Date,
  frequency: string,
  dayOfMonth?: number,
): string {
  const date = new Date(currentDate);

  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'biweekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      if (dayOfMonth) {
        const maxDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        date.setDate(Math.min(dayOfMonth, maxDay));
      }
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      if (dayOfMonth) {
        const maxDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        date.setDate(Math.min(dayOfMonth, maxDay));
      }
      break;
    case 'semi-annually':
      date.setMonth(date.getMonth() + 6);
      if (dayOfMonth) {
        const maxDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        date.setDate(Math.min(dayOfMonth, maxDay));
      }
      break;
    case 'annually':
      date.setFullYear(date.getFullYear() + 1);
      if (dayOfMonth) {
        const maxDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        date.setDate(Math.min(dayOfMonth, maxDay));
      }
      break;
    default:
      // Fallback to monthly
      date.setMonth(date.getMonth() + 1);
  }

  return date.toISOString().split('T')[0];
}
