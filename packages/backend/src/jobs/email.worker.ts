import { Job } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import Handlebars from 'handlebars';
import { getDatabase } from '../database/connection';
import { sendEmail, compileTemplate, EMAIL_TEMPLATES } from '../utils/email';
import { config } from '../config';
import { logger } from '../config/logger';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface SendTransactionalData {
  tenantSchema: string;
  template: string;
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  data: Record<string, any>;
  generatePdf?: boolean;
  pdfEntityType?: string;
  pdfEntityId?: string;
  attachments?: Array<{
    filename: string;
    content: string; // base64 encoded
    contentType: string;
  }>;
}

interface SendBatchData {
  tenantSchema: string;
  template: string;
  subject: string;
  recipients: Array<{
    to: string;
    data: Record<string, any>;
  }>;
}

interface TrackDeliveryData {
  tenantSchema: string;
  emailId: string;
  status: 'delivered' | 'bounced' | 'opened' | 'clicked';
  metadata?: Record<string, any>;
}

// ------------------------------------------------------------------
// Email Templates (extends the base templates from utils/email)
// ------------------------------------------------------------------

const EXTENDED_TEMPLATES: Record<string, string> = {
  // Base templates from utils/email are used directly via the key
  ...Object.fromEntries(
    Object.entries(EMAIL_TEMPLATES).map(([key, value]) => [key, value]),
  ),

  // Additional transactional templates
  estimateEmail: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1F2937;">Estimate {{estimateNumber}}</h2>
      <p>Hi {{customerName}},</p>
      <p>Please review the estimate below:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background-color: #F3F4F6;">
          <td style="padding: 10px; font-weight: bold;">Estimate Number</td>
          <td style="padding: 10px;">{{estimateNumber}}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold;">Total Amount</td>
          <td style="padding: 10px;">{{totalAmount}}</td>
        </tr>
        <tr style="background-color: #F3F4F6;">
          <td style="padding: 10px; font-weight: bold;">Valid Until</td>
          <td style="padding: 10px;">{{expirationDate}}</td>
        </tr>
      </table>
      {{#if acceptLink}}
      <p>
        <a href="{{acceptLink}}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Estimate</a>
        <a href="{{rejectLink}}" style="background-color: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-left: 10px;">Decline</a>
      </p>
      {{/if}}
      {{#if message}}
      <p style="margin-top: 20px; color: #6B7280;">{{message}}</p>
      {{/if}}
    </div>
  `,

  paymentReceiptEmail: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1F2937;">Payment Receipt</h2>
      <p>Hi {{customerName}},</p>
      <p>Thank you for your payment. Here are the details:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background-color: #F3F4F6;">
          <td style="padding: 10px; font-weight: bold;">Payment Date</td>
          <td style="padding: 10px;">{{paymentDate}}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold;">Amount</td>
          <td style="padding: 10px;">{{amount}}</td>
        </tr>
        <tr style="background-color: #F3F4F6;">
          <td style="padding: 10px; font-weight: bold;">Payment Method</td>
          <td style="padding: 10px;">{{paymentMethod}}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold;">Reference</td>
          <td style="padding: 10px;">{{referenceNumber}}</td>
        </tr>
        {{#if invoiceNumber}}
        <tr style="background-color: #F3F4F6;">
          <td style="padding: 10px; font-weight: bold;">Applied To</td>
          <td style="padding: 10px;">Invoice {{invoiceNumber}}</td>
        </tr>
        {{/if}}
      </table>
      {{#if remainingBalance}}
      <p><strong>Remaining Balance:</strong> {{remainingBalance}}</p>
      {{/if}}
      <p style="color: #6B7280;">Thank you for your business!</p>
    </div>
  `,

  reportDeliveryEmail: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1F2937;">Your Scheduled Report</h2>
      <p>Hi {{recipientName}},</p>
      <p>Your scheduled report <strong>{{reportName}}</strong> is ready.</p>
      <p><strong>Report Period:</strong> {{reportPeriod}}</p>
      <p><strong>Generated:</strong> {{generatedAt}}</p>
      <p>The report is attached to this email in {{format}} format.</p>
      {{#if dashboardLink}}
      <p><a href="{{dashboardLink}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View in Dashboard</a></p>
      {{/if}}
    </div>
  `,

  bankSyncFailed: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #DC2626;">Bank Sync Failed</h2>
      <p>Hi {{firstName}},</p>
      <p>We were unable to sync transactions for <strong>{{accountName}}</strong>.</p>
      <p><strong>Error:</strong> {{errorMessage}}</p>
      <p>Please check your bank connection settings and try again.</p>
      <p><a href="{{dashboardLink}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Go to Banking</a></p>
    </div>
  `,

  creditMemoEmail: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1F2937;">Credit Memo {{creditMemoNumber}}</h2>
      <p>Hi {{customerName}},</p>
      <p>A credit memo has been issued to your account:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background-color: #F3F4F6;">
          <td style="padding: 10px; font-weight: bold;">Credit Memo Number</td>
          <td style="padding: 10px;">{{creditMemoNumber}}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold;">Amount</td>
          <td style="padding: 10px;">{{amount}}</td>
        </tr>
        <tr style="background-color: #F3F4F6;">
          <td style="padding: 10px; font-weight: bold;">Date</td>
          <td style="padding: 10px;">{{date}}</td>
        </tr>
      </table>
      {{#if memo}}
      <p>{{memo}}</p>
      {{/if}}
    </div>
  `,

  statementEmail: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1F2937;">Account Statement</h2>
      <p>Hi {{customerName}},</p>
      <p>Please find your account statement for the period {{periodStart}} to {{periodEnd}}.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background-color: #F3F4F6;">
          <td style="padding: 10px; font-weight: bold;">Opening Balance</td>
          <td style="padding: 10px;">{{openingBalance}}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold;">Total Invoiced</td>
          <td style="padding: 10px;">{{totalInvoiced}}</td>
        </tr>
        <tr style="background-color: #F3F4F6;">
          <td style="padding: 10px; font-weight: bold;">Total Payments</td>
          <td style="padding: 10px;">{{totalPayments}}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold;">Closing Balance</td>
          <td style="padding: 10px; font-weight: bold; color: #DC2626;">{{closingBalance}}</td>
        </tr>
      </table>
      <p>The full statement is attached to this email.</p>
    </div>
  `,
};

// Register Handlebars helpers for templates
Handlebars.registerHelper('formatCurrency', function (value: string | number) {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Handlebars.SafeString(
    num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  );
});

Handlebars.registerHelper('formatDate', function (value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
});

// ------------------------------------------------------------------
// Main Job Processor
// ------------------------------------------------------------------

export async function processEmailJob(job: Job): Promise<any> {
  logger.info(`Processing email job: ${job.name} (${job.id})`);

  switch (job.name) {
    case 'send-transactional':
      return sendTransactionalEmail(job);
    case 'send-batch':
      return sendBatchEmails(job);
    case 'track-delivery':
      return trackDeliveryStatus(job);
    default:
      throw new Error(`Unknown email job name: ${job.name}`);
  }
}

// ------------------------------------------------------------------
// send-transactional: Send a single transactional email
// ------------------------------------------------------------------

async function sendTransactionalEmail(job: Job<SendTransactionalData>): Promise<{
  sent: boolean;
  messageId?: string;
}> {
  const { tenantSchema, template, to, cc, bcc, subject, data, generatePdf, pdfEntityType, pdfEntityId, attachments } = job.data;
  const db = getDatabase();

  try {
    // Resolve the template
    const templateString = EXTENDED_TEMPLATES[template];
    if (!templateString) {
      throw new Error(`Email template "${template}" not found`);
    }

    // Inject common template data
    const tenant = await db('public.tenants')
      .whereRaw("schema_name = ?", [tenantSchema])
      .first();

    const enrichedData = {
      ...data,
      companyName: tenant?.company_name || 'CloudBooks Pro',
      companyLogo: tenant?.logo_url || '',
      appUrl: config.app.url,
      currentYear: new Date().getFullYear(),
    };

    // Compile the template with data
    const htmlContent = wrapInEmailLayout(
      compileTemplate(templateString, enrichedData),
      tenant?.company_name || 'CloudBooks Pro',
    );

    // Build attachments list
    const emailAttachments: Array<{ filename: string; content: Buffer; contentType?: string }> = [];

    // Decode any provided base64 attachments
    if (attachments && attachments.length > 0) {
      for (const att of attachments) {
        emailAttachments.push({
          filename: att.filename,
          content: Buffer.from(att.content, 'base64'),
          contentType: att.contentType,
        });
      }
    }

    // Generate and attach PDF if requested
    if (generatePdf && pdfEntityType && pdfEntityId) {
      try {
        const pdfBuffer = await generatePdfAttachment(tenantSchema, pdfEntityType, pdfEntityId);
        if (pdfBuffer) {
          emailAttachments.push({
            filename: `${pdfEntityType}-${pdfEntityId.substring(0, 8)}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          });
        }
      } catch (pdfError) {
        logger.warn(`Failed to generate PDF attachment for ${pdfEntityType}/${pdfEntityId}:`, pdfError);
        // Continue sending email without attachment
      }
    }

    // Send the email
    const sent = await sendEmail({
      to,
      subject,
      html: htmlContent,
      cc,
      bcc,
      attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
    });

    if (!sent) {
      throw new Error(`Email delivery failed for ${to}`);
    }

    // Log email in the database for tracking
    try {
      await db.withSchema(tenantSchema).table('audit_logs').insert({
        id: uuidv4(),
        timestamp: new Date(),
        action: 'create',
        entity_type: 'email',
        entity_id: job.id || uuidv4(),
        changes: JSON.stringify([
          { field: 'to', newValue: Array.isArray(to) ? to.join(', ') : to },
          { field: 'subject', newValue: subject },
          { field: 'template', newValue: template },
          { field: 'status', newValue: 'sent' },
        ]),
        metadata: JSON.stringify({
          jobId: job.id,
          hasAttachments: emailAttachments.length > 0,
        }),
      });
    } catch (logError) {
      // Non-critical: don't fail the job if logging fails
      logger.warn('Failed to log email delivery in audit:', logError);
    }

    logger.info(`Transactional email sent: template=${template}, to=${to}, subject="${subject}"`);
    return { sent: true };
  } catch (error) {
    logger.error(`Failed to send transactional email (template=${template}, to=${to}):`, error);
    throw error;
  }
}

// ------------------------------------------------------------------
// send-batch: Send emails to a list of recipients
// ------------------------------------------------------------------

async function sendBatchEmails(job: Job<SendBatchData>): Promise<{
  sent: number;
  failed: number;
  errors: string[];
}> {
  const { tenantSchema, template, subject, recipients } = job.data;
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    const totalRecipients = recipients.length;

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];

      try {
        // Re-use the transactional email logic via queue to leverage retry
        // For batch emails we send them directly to avoid queue recursion
        const templateString = EXTENDED_TEMPLATES[template];
        if (!templateString) {
          throw new Error(`Email template "${template}" not found`);
        }

        const db = getDatabase();
        const tenant = await db('public.tenants')
          .whereRaw("schema_name = ?", [tenantSchema])
          .first();

        const enrichedData = {
          ...recipient.data,
          companyName: tenant?.company_name || 'CloudBooks Pro',
          appUrl: config.app.url,
          currentYear: new Date().getFullYear(),
        };

        const htmlContent = wrapInEmailLayout(
          compileTemplate(templateString, enrichedData),
          tenant?.company_name || 'CloudBooks Pro',
        );

        const success = await sendEmail({
          to: recipient.to,
          subject,
          html: htmlContent,
        });

        if (success) {
          sent++;
        } else {
          failed++;
          errors.push(`Failed to send to ${recipient.to}`);
        }
      } catch (recipientError) {
        failed++;
        const errorMsg = recipientError instanceof Error ? recipientError.message : 'Unknown error';
        errors.push(`${recipient.to}: ${errorMsg}`);
        logger.error(`Batch email failed for ${recipient.to}:`, recipientError);
      }

      // Update progress
      await job.updateProgress(Math.floor(((i + 1) / totalRecipients) * 100));

      // Small delay between sends to avoid rate limiting
      if (i < recipients.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    logger.info(`Batch email complete: ${sent} sent, ${failed} failed out of ${totalRecipients} recipients`);
    return { sent, failed, errors };
  } catch (error) {
    logger.error('Failed to process batch email job:', error);
    throw error;
  }
}

// ------------------------------------------------------------------
// track-delivery: Update email delivery status
// ------------------------------------------------------------------

async function trackDeliveryStatus(job: Job<TrackDeliveryData>): Promise<void> {
  const { tenantSchema, emailId, status, metadata } = job.data;
  const db = getDatabase();

  try {
    // Update the audit log entry for this email with delivery status
    const existingLog = await db.withSchema(tenantSchema).table('audit_logs')
      .where({ entity_type: 'email', entity_id: emailId })
      .first();

    if (existingLog) {
      const currentMetadata = typeof existingLog.metadata === 'string'
        ? JSON.parse(existingLog.metadata)
        : existingLog.metadata || {};

      // Append delivery event
      if (!currentMetadata.deliveryEvents) {
        currentMetadata.deliveryEvents = [];
      }

      currentMetadata.deliveryEvents.push({
        status,
        timestamp: new Date().toISOString(),
        ...(metadata || {}),
      });

      currentMetadata.latestStatus = status;

      await db.withSchema(tenantSchema).table('audit_logs')
        .where({ id: existingLog.id })
        .update({
          metadata: JSON.stringify(currentMetadata),
        });
    }

    // If the email bounced, create a notification
    if (status === 'bounced') {
      const auditEntry = existingLog;
      if (auditEntry) {
        const changes = typeof auditEntry.changes === 'string'
          ? JSON.parse(auditEntry.changes)
          : auditEntry.changes;
        const toField = changes.find((c: any) => c.field === 'to');
        const recipientEmail = toField?.newValue || 'unknown';

        await db.withSchema(tenantSchema).table('notifications').insert({
          id: uuidv4(),
          user_id: auditEntry.user_id || '00000000-0000-0000-0000-000000000000',
          type: 'email_bounced',
          title: 'Email Delivery Failed',
          message: `Email to ${recipientEmail} bounced. Please verify the email address.`,
          is_read: false,
          created_at: new Date(),
        });
      }
    }

    logger.info(`Email delivery status updated: emailId=${emailId}, status=${status}`);
  } catch (error) {
    logger.error(`Failed to track email delivery status for ${emailId}:`, error);
    throw error;
  }
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/**
 * Wraps email body content in a consistent HTML layout with header/footer.
 */
function wrapInEmailLayout(bodyHtml: string, companyName: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${companyName}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F9FAFB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F9FAFB; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="background-color: #4F46E5; padding: 24px; text-align: center;">
                  <h1 style="color: #FFFFFF; margin: 0; font-size: 24px; font-weight: 600;">${companyName}</h1>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding: 32px 24px;">
                  ${bodyHtml}
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background-color: #F3F4F6; padding: 20px 24px; text-align: center; font-size: 12px; color: #9CA3AF;">
                  <p style="margin: 0;">This email was sent by ${companyName} via CloudBooks Pro.</p>
                  <p style="margin: 8px 0 0 0;">
                    <a href="${config.app.url}" style="color: #6B7280; text-decoration: underline;">Visit Dashboard</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

/**
 * Generates a PDF for the given entity. This is a placeholder that
 * would integrate with a PDF generation service (e.g., Puppeteer,
 * wkhtmltopdf, or a third-party API).
 */
async function generatePdfAttachment(
  _tenantSchema: string,
  entityType: string,
  _entityId: string,
): Promise<Buffer | null> {
  // In production, this would:
  // 1. Fetch the entity data from the database
  // 2. Render an HTML template
  // 3. Convert to PDF using Puppeteer or similar

  logger.info(`PDF generation requested for ${entityType}/${_entityId} - using placeholder`);

  // Return null to skip attachment in development
  // In production, return the actual PDF buffer
  return null;
}
