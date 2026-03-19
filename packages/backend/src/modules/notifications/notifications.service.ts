import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/connection';
import { AppError } from '../../utils/app-error';
import { paginate } from '../../utils/pagination';

export class NotificationsService {
  private db = getDatabase();

  async list(schema: string, userId: string, options: any) {
    let query = this.db.withSchema(schema).table('notifications')
      .where({ user_id: userId, is_deleted: false });
    if (options.isRead !== undefined) query = query.where({ is_read: options.isRead === 'true' });
    if (options.type) query = query.where({ type: options.type });
    return paginate(query, {
      page: parseInt(options.page) || 1, limit: parseInt(options.limit) || 25,
      sortBy: 'created_at', sortOrder: 'desc',
    });
  }

  async getUnreadCount(schema: string, userId: string) {
    const result = await this.db.withSchema(schema).table('notifications')
      .where({ user_id: userId, is_read: false, is_deleted: false })
      .count('id as count').first();
    return parseInt(result?.count as string) || 0;
  }

  async getById(schema: string, id: string, userId: string) {
    const notification = await this.db.withSchema(schema).table('notifications')
      .where({ id, user_id: userId, is_deleted: false }).first();
    if (!notification) throw new AppError('Notification not found', 404);
    return notification;
  }

  async markRead(schema: string, id: string, userId: string) {
    await this.db.withSchema(schema).table('notifications')
      .where({ id, user_id: userId }).update({ is_read: true, read_at: new Date() });
  }

  async markAllRead(schema: string, userId: string) {
    const result = await this.db.withSchema(schema).table('notifications')
      .where({ user_id: userId, is_read: false }).update({ is_read: true, read_at: new Date() });
    return result;
  }

  async delete(schema: string, id: string, userId: string) {
    await this.db.withSchema(schema).table('notifications')
      .where({ id, user_id: userId }).update({ is_deleted: true });
  }

  async deleteAll(schema: string, userId: string) {
    await this.db.withSchema(schema).table('notifications')
      .where({ user_id: userId }).update({ is_deleted: true });
  }

  async getPreferences(schema: string, userId: string) {
    const prefs = await this.db.withSchema(schema).table('notification_preferences')
      .where({ user_id: userId }).first();
    return prefs || {
      invoice_overdue: true, invoice_paid: true, bill_due: true,
      payment_received: true, low_stock: true, timesheet_approval: true,
      payroll_processed: true, bank_sync: true,
      email_enabled: true, push_enabled: true, in_app_enabled: true,
    };
  }

  async updatePreferences(schema: string, userId: string, data: any) {
    const existing = await this.db.withSchema(schema).table('notification_preferences')
      .where({ user_id: userId }).first();
    const prefs = {
      invoice_overdue: data.invoiceOverdue, invoice_paid: data.invoicePaid,
      bill_due: data.billDue, payment_received: data.paymentReceived,
      low_stock: data.lowStock, timesheet_approval: data.timesheetApproval,
      payroll_processed: data.payrollProcessed, bank_sync: data.bankSync,
      email_enabled: data.emailEnabled, push_enabled: data.pushEnabled,
      in_app_enabled: data.inAppEnabled, updated_at: new Date(),
    };
    // Remove undefined values
    Object.keys(prefs).forEach(key => {
      if ((prefs as any)[key] === undefined) delete (prefs as any)[key];
    });

    if (existing) {
      await this.db.withSchema(schema).table('notification_preferences')
        .where({ user_id: userId }).update(prefs);
    } else {
      await this.db.withSchema(schema).table('notification_preferences')
        .insert({ id: uuidv4(), user_id: userId, ...prefs });
    }
  }

  // Static method to send notifications (called by other services)
  static async send(schema: string, notification: {
    userId: string; type: string; title: string; message: string;
    entityType?: string; entityId?: string; actionUrl?: string;
  }) {
    const db = getDatabase();

    // Check user preferences
    const prefs = await db.withSchema(schema).table('notification_preferences')
      .where({ user_id: notification.userId }).first();
    if (prefs && prefs.in_app_enabled === false) return;

    await db.withSchema(schema).table('notifications').insert({
      id: uuidv4(), user_id: notification.userId, type: notification.type,
      title: notification.title, message: notification.message,
      entity_type: notification.entityType, entity_id: notification.entityId,
      action_url: notification.actionUrl, is_read: false,
    });

    // In production, also send email/push notifications based on preferences
  }

  // Bulk send to multiple users
  static async sendBulk(schema: string, userIds: string[], notification: {
    type: string; title: string; message: string;
    entityType?: string; entityId?: string; actionUrl?: string;
  }) {
    for (const userId of userIds) {
      await NotificationsService.send(schema, { ...notification, userId });
    }
  }
}
