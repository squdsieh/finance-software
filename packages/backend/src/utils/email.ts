import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import { config } from '../config';
import { logger } from '../config/logger';

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.port === 465,
  auth: {
    user: config.email.user,
    pass: config.email.password,
  },
});

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: config.email.from,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      cc: options.cc?.join(', '),
      bcc: options.bcc?.join(', '),
      attachments: options.attachments,
    });
    logger.info(`Email sent to ${options.to}`);
    return true;
  } catch (error) {
    logger.error('Failed to send email:', error);
    return false;
  }
}

export function compileTemplate(templateString: string, data: Record<string, unknown>): string {
  const template = Handlebars.compile(templateString);
  return template(data);
}

export const EMAIL_TEMPLATES = {
  verifyEmail: `
    <h2>Welcome to CloudBooks Pro!</h2>
    <p>Hi {{firstName}},</p>
    <p>Please verify your email address by clicking the link below:</p>
    <p><a href="{{verificationUrl}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Verify Email</a></p>
    <p>This link expires in 24 hours.</p>
    <p>If you did not create an account, please ignore this email.</p>
  `,
  resetPassword: `
    <h2>Password Reset Request</h2>
    <p>Hi {{firstName}},</p>
    <p>Click the link below to reset your password:</p>
    <p><a href="{{resetUrl}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Reset Password</a></p>
    <p>This link expires in 1 hour.</p>
    <p>If you did not request a password reset, please ignore this email.</p>
  `,
  inviteUser: `
    <h2>You've Been Invited to CloudBooks Pro</h2>
    <p>Hi,</p>
    <p>{{inviterName}} has invited you to join {{companyName}} on CloudBooks Pro.</p>
    <p><a href="{{inviteUrl}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Accept Invitation</a></p>
  `,
  invoiceEmail: `
    <h2>Invoice {{invoiceNumber}}</h2>
    <p>Hi {{customerName}},</p>
    <p>Please find your invoice below:</p>
    <p><strong>Invoice Number:</strong> {{invoiceNumber}}</p>
    <p><strong>Amount Due:</strong> {{amountDue}}</p>
    <p><strong>Due Date:</strong> {{dueDate}}</p>
    {{#if paymentLink}}
    <p><a href="{{paymentLink}}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Pay Now</a></p>
    {{/if}}
    <p>{{memo}}</p>
  `,
  paymentReminder: `
    <h2>Payment Reminder</h2>
    <p>Hi {{customerName}},</p>
    <p>This is a {{reminderType}} regarding invoice {{invoiceNumber}}.</p>
    <p><strong>Amount Due:</strong> {{amountDue}}</p>
    <p><strong>Due Date:</strong> {{dueDate}}</p>
    {{#if paymentLink}}
    <p><a href="{{paymentLink}}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Pay Now</a></p>
    {{/if}}
  `,
};
