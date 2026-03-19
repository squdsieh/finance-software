import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/connection';
import { AppError } from '../../utils/app-error';
import { paginate } from '../../utils/pagination';
import { ServiceContext } from '../../types';

export class TimeTrackingService {
  private db = getDatabase();

  async listEntries(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('time_entries').where({ is_deleted: false });
    if (options.userId) query = query.where({ user_id: options.userId });
    if (options.projectId) query = query.where({ project_id: options.projectId });
    if (options.customerId) query = query.where({ customer_id: options.customerId });
    if (options.isBillable !== undefined) query = query.where({ is_billable: options.isBillable === 'true' });
    if (options.fromDate) query = query.where('date', '>=', options.fromDate);
    if (options.toDate) query = query.where('date', '<=', options.toDate);
    return paginate(query, {
      page: parseInt(options.page) || 1, limit: parseInt(options.limit) || 50,
      sortBy: 'date', sortOrder: 'desc',
    });
  }

  async getEntry(schema: string, id: string) {
    const entry = await this.db.withSchema(schema).table('time_entries').where({ id, is_deleted: false }).first();
    if (!entry) throw new AppError('Time entry not found', 404);
    return entry;
  }

  async createEntry(ctx: ServiceContext, data: any) {
    const id = uuidv4();
    const duration = data.duration || this.calculateDuration(data.startTime, data.endTime);
    await this.db.withSchema(ctx.tenantSchema).table('time_entries').insert({
      id, user_id: data.userId || ctx.userId, project_id: data.projectId,
      task_id: data.taskId, customer_id: data.customerId,
      date: data.date, start_time: data.startTime, end_time: data.endTime,
      duration, description: data.description,
      is_billable: data.isBillable !== undefined ? data.isBillable : true,
      hourly_rate: data.hourlyRate || 0, billable_amount: (data.hourlyRate || 0) * (duration / 60),
      status: 'logged', created_by: ctx.userId,
    });
    return { id, duration };
  }

  async updateEntry(ctx: ServiceContext, id: string, data: any) {
    const existing = await this.db.withSchema(ctx.tenantSchema).table('time_entries').where({ id }).first();
    if (!existing) throw new AppError('Time entry not found', 404);
    if (existing.status === 'invoiced') throw new AppError('Cannot edit invoiced time entry', 400);

    const updates: Record<string, any> = { updated_at: new Date() };
    if (data.projectId) updates.project_id = data.projectId;
    if (data.taskId) updates.task_id = data.taskId;
    if (data.date) updates.date = data.date;
    if (data.startTime) updates.start_time = data.startTime;
    if (data.endTime) updates.end_time = data.endTime;
    if (data.duration) updates.duration = data.duration;
    if (data.description) updates.description = data.description;
    if (data.isBillable !== undefined) updates.is_billable = data.isBillable;
    if (data.hourlyRate) {
      updates.hourly_rate = data.hourlyRate;
      updates.billable_amount = data.hourlyRate * ((data.duration || existing.duration) / 60);
    }
    await this.db.withSchema(ctx.tenantSchema).table('time_entries').where({ id }).update(updates);
    return { id };
  }

  async deleteEntry(ctx: ServiceContext, id: string) {
    const existing = await this.db.withSchema(ctx.tenantSchema).table('time_entries').where({ id }).first();
    if (!existing) throw new AppError('Time entry not found', 404);
    if (existing.status === 'invoiced') throw new AppError('Cannot delete invoiced time entry', 400);
    await this.db.withSchema(ctx.tenantSchema).table('time_entries').where({ id }).update({
      is_deleted: true, updated_at: new Date(),
    });
  }

  async startTimer(ctx: ServiceContext, data: any) {
    // Check for active timer
    const active = await this.db.withSchema(ctx.tenantSchema).table('time_entries')
      .where({ user_id: ctx.userId, status: 'running' }).first();
    if (active) throw new AppError('A timer is already running. Stop it first.', 400);

    const id = uuidv4();
    await this.db.withSchema(ctx.tenantSchema).table('time_entries').insert({
      id, user_id: ctx.userId, project_id: data.projectId,
      task_id: data.taskId, customer_id: data.customerId,
      date: new Date().toISOString().split('T')[0],
      start_time: new Date().toISOString(), description: data.description,
      is_billable: data.isBillable !== undefined ? data.isBillable : true,
      hourly_rate: data.hourlyRate || 0, status: 'running', created_by: ctx.userId,
    });
    return { id, startTime: new Date().toISOString() };
  }

  async stopTimer(ctx: ServiceContext) {
    const active = await this.db.withSchema(ctx.tenantSchema).table('time_entries')
      .where({ user_id: ctx.userId, status: 'running' }).first();
    if (!active) throw new AppError('No active timer found', 404);

    const endTime = new Date();
    const startTime = new Date(active.start_time);
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000); // minutes
    const billableAmount = (active.hourly_rate || 0) * (duration / 60);

    await this.db.withSchema(ctx.tenantSchema).table('time_entries').where({ id: active.id }).update({
      end_time: endTime.toISOString(), duration, billable_amount: billableAmount,
      status: 'logged', updated_at: new Date(),
    });

    return { id: active.id, duration, billableAmount };
  }

  async getActiveTimer(ctx: ServiceContext) {
    return this.db.withSchema(ctx.tenantSchema).table('time_entries')
      .where({ user_id: ctx.userId, status: 'running' }).first() || null;
  }

  async listTimesheets(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('timesheets');
    if (options.userId) query = query.where({ user_id: options.userId });
    if (options.status) query = query.where({ status: options.status });
    return paginate(query, {
      page: parseInt(options.page) || 1, limit: parseInt(options.limit) || 25,
      sortBy: 'week_ending', sortOrder: 'desc',
    });
  }

  async getTimesheet(schema: string, id: string) {
    const timesheet = await this.db.withSchema(schema).table('timesheets').where({ id }).first();
    if (!timesheet) throw new AppError('Timesheet not found', 404);
    const entries = await this.db.withSchema(schema).table('time_entries')
      .where({ timesheet_id: id, is_deleted: false }).orderBy('date');
    return { ...timesheet, entries };
  }

  async createTimesheet(ctx: ServiceContext, data: any) {
    const id = uuidv4();
    await this.db.withSchema(ctx.tenantSchema).table('timesheets').insert({
      id, user_id: data.userId || ctx.userId, week_starting: data.weekStarting,
      week_ending: data.weekEnding, status: 'draft',
      total_hours: 0, billable_hours: 0, created_by: ctx.userId,
    });

    // Attach unassigned time entries for this week
    if (data.entryIds?.length) {
      await this.db.withSchema(ctx.tenantSchema).table('time_entries')
        .whereIn('id', data.entryIds).update({ timesheet_id: id });
    }

    return { id };
  }

  async submitTimesheet(ctx: ServiceContext, id: string) {
    const timesheet = await this.db.withSchema(ctx.tenantSchema).table('timesheets').where({ id }).first();
    if (!timesheet) throw new AppError('Timesheet not found', 404);
    if (timesheet.status !== 'draft') throw new AppError('Timesheet already submitted', 400);

    // Calculate totals
    const entries = await this.db.withSchema(ctx.tenantSchema).table('time_entries')
      .where({ timesheet_id: id, is_deleted: false });
    const totalMinutes = entries.reduce((sum: number, e: any) => sum + (e.duration || 0), 0);
    const billableMinutes = entries.filter((e: any) => e.is_billable)
      .reduce((sum: number, e: any) => sum + (e.duration || 0), 0);

    await this.db.withSchema(ctx.tenantSchema).table('timesheets').where({ id }).update({
      status: 'submitted', submitted_at: new Date(),
      total_hours: totalMinutes / 60, billable_hours: billableMinutes / 60, updated_at: new Date(),
    });
  }

  async approveTimesheet(ctx: ServiceContext, id: string) {
    const timesheet = await this.db.withSchema(ctx.tenantSchema).table('timesheets').where({ id }).first();
    if (!timesheet) throw new AppError('Timesheet not found', 404);
    if (timesheet.status !== 'submitted') throw new AppError('Timesheet must be submitted first', 400);
    await this.db.withSchema(ctx.tenantSchema).table('timesheets').where({ id }).update({
      status: 'approved', approved_by: ctx.userId, approved_at: new Date(), updated_at: new Date(),
    });
    // Mark entries as approved
    await this.db.withSchema(ctx.tenantSchema).table('time_entries')
      .where({ timesheet_id: id }).update({ status: 'approved' });
  }

  async rejectTimesheet(ctx: ServiceContext, id: string, data: any) {
    await this.db.withSchema(ctx.tenantSchema).table('timesheets').where({ id }).update({
      status: 'rejected', rejection_reason: data.reason, rejected_by: ctx.userId,
      rejected_at: new Date(), updated_at: new Date(),
    });
  }

  async listBillableTime(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('time_entries')
      .where({ is_billable: true, is_deleted: false })
      .whereIn('status', ['logged', 'approved'])
      .where({ invoice_id: null });
    if (options.customerId) query = query.where({ customer_id: options.customerId });
    if (options.projectId) query = query.where({ project_id: options.projectId });
    return query.orderBy('date');
  }

  async createInvoiceFromTime(ctx: ServiceContext, data: any) {
    const entries = await this.db.withSchema(ctx.tenantSchema).table('time_entries')
      .whereIn('id', data.entryIds).where({ is_billable: true });
    if (!entries.length) throw new AppError('No billable time entries found', 400);

    const totalAmount = entries.reduce((sum: number, e: any) => sum + (parseFloat(e.billable_amount) || 0), 0);

    // Create invoice (delegates to invoicing module)
    const invoiceId = uuidv4();
    await this.db.withSchema(ctx.tenantSchema).table('invoices').insert({
      id: invoiceId, invoice_number: `INV-T-${Date.now()}`, customer_id: data.customerId,
      date: new Date().toISOString().split('T')[0],
      due_date: data.dueDate, subtotal: totalAmount, total: totalAmount,
      status: 'draft', source_type: 'time_tracking',
      created_by: ctx.userId, updated_by: ctx.userId,
    });

    // Mark entries as invoiced
    await this.db.withSchema(ctx.tenantSchema).table('time_entries')
      .whereIn('id', data.entryIds).update({ status: 'invoiced', invoice_id: invoiceId });

    return { invoiceId, totalAmount, entriesCount: entries.length };
  }

  async timeSummary(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('time_entries').where({ is_deleted: false });
    if (options.fromDate) query = query.where('date', '>=', options.fromDate);
    if (options.toDate) query = query.where('date', '<=', options.toDate);
    const entries = await query;
    const totalMinutes = entries.reduce((sum: number, e: any) => sum + (e.duration || 0), 0);
    const billableMinutes = entries.filter((e: any) => e.is_billable).reduce((sum: number, e: any) => sum + (e.duration || 0), 0);
    const totalBillableAmount = entries.reduce((sum: number, e: any) => sum + (parseFloat(e.billable_amount) || 0), 0);
    return {
      totalHours: (totalMinutes / 60).toFixed(2),
      billableHours: (billableMinutes / 60).toFixed(2),
      nonBillableHours: ((totalMinutes - billableMinutes) / 60).toFixed(2),
      billablePercentage: totalMinutes > 0 ? ((billableMinutes / totalMinutes) * 100).toFixed(1) : '0',
      totalBillableAmount: totalBillableAmount.toFixed(2),
      entryCount: entries.length,
    };
  }

  async timeByProject(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('time_entries')
      .where({ 'time_entries.is_deleted': false })
      .leftJoin('projects', 'time_entries.project_id', 'projects.id');
    if (options.fromDate) query = query.where('time_entries.date', '>=', options.fromDate);
    if (options.toDate) query = query.where('time_entries.date', '<=', options.toDate);
    return query.select(
      'projects.id as project_id', 'projects.name as project_name',
      this.db.raw('SUM(time_entries.duration) as total_minutes'),
      this.db.raw('SUM(CASE WHEN time_entries.is_billable THEN time_entries.duration ELSE 0 END) as billable_minutes'),
      this.db.raw('SUM(time_entries.billable_amount) as total_billable_amount'),
      this.db.raw('COUNT(time_entries.id) as entry_count')
    ).groupBy('projects.id', 'projects.name');
  }

  async timeByEmployee(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('time_entries')
      .where({ 'time_entries.is_deleted': false })
      .leftJoin('users', 'time_entries.user_id', 'users.id');
    if (options.fromDate) query = query.where('time_entries.date', '>=', options.fromDate);
    if (options.toDate) query = query.where('time_entries.date', '<=', options.toDate);
    return query.select(
      'users.id as user_id', 'users.first_name', 'users.last_name',
      this.db.raw('SUM(time_entries.duration) as total_minutes'),
      this.db.raw('SUM(CASE WHEN time_entries.is_billable THEN time_entries.duration ELSE 0 END) as billable_minutes'),
      this.db.raw('SUM(time_entries.billable_amount) as total_billable_amount')
    ).groupBy('users.id', 'users.first_name', 'users.last_name');
  }

  private calculateDuration(startTime?: string, endTime?: string): number {
    if (!startTime || !endTime) return 0;
    const start = new Date(startTime);
    const end = new Date(endTime);
    return Math.round((end.getTime() - start.getTime()) / 60000);
  }
}
