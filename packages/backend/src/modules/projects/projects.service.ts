import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/connection';
import { AppError } from '../../utils/app-error';
import { paginate } from '../../utils/pagination';
import { ServiceContext } from '../../types';

export class ProjectsService {
  private db = getDatabase();

  async list(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('projects').where({ is_deleted: false });
    if (options.status) query = query.where({ status: options.status });
    if (options.customerId) query = query.where({ customer_id: options.customerId });
    if (options.search) query = query.where('name', 'ilike', `%${options.search}%`);
    return paginate(query, {
      page: parseInt(options.page) || 1, limit: parseInt(options.limit) || 25,
      sortBy: options.sortBy || 'name', sortOrder: options.sortOrder || 'asc',
    });
  }

  async getById(schema: string, id: string) {
    const project = await this.db.withSchema(schema).table('projects').where({ id, is_deleted: false }).first();
    if (!project) throw new AppError('Project not found', 404);
    const tasks = await this.db.withSchema(schema).table('project_tasks')
      .where({ project_id: id, is_deleted: false }).orderBy('sort_order');
    const members = await this.db.withSchema(schema).table('project_members')
      .where({ project_id: id })
      .leftJoin('users', 'project_members.user_id', 'users.id')
      .select('project_members.*', 'users.first_name', 'users.last_name', 'users.email');
    return { ...project, tasks, members };
  }

  async create(ctx: ServiceContext, data: any) {
    const id = uuidv4();
    await this.db.withSchema(ctx.tenantSchema).table('projects').insert({
      id, name: data.name, description: data.description,
      customer_id: data.customerId, project_number: data.projectNumber || `PRJ-${Date.now()}`,
      status: data.status || 'active', billing_method: data.billingMethod || 'time_and_materials',
      budget_amount: data.budgetAmount || 0, budget_hours: data.budgetHours || 0,
      hourly_rate: data.hourlyRate || 0, fixed_fee: data.fixedFee || 0,
      start_date: data.startDate, end_date: data.endDate,
      color: data.color || '#4F46E5', created_by: ctx.userId, updated_by: ctx.userId,
    });
    return { id };
  }

  async update(ctx: ServiceContext, id: string, data: any) {
    const updates: Record<string, any> = { updated_at: new Date(), updated_by: ctx.userId };
    const fields: Record<string, string> = {
      name: 'name', description: 'description', status: 'status',
      billingMethod: 'billing_method', budgetAmount: 'budget_amount',
      budgetHours: 'budget_hours', hourlyRate: 'hourly_rate',
      fixedFee: 'fixed_fee', startDate: 'start_date', endDate: 'end_date', color: 'color',
    };
    Object.entries(fields).forEach(([camel, snake]) => {
      if (data[camel] !== undefined) updates[snake] = data[camel];
    });
    await this.db.withSchema(ctx.tenantSchema).table('projects').where({ id }).update(updates);
    return { id };
  }

  async delete(ctx: ServiceContext, id: string) {
    await this.db.withSchema(ctx.tenantSchema).table('projects').where({ id }).update({
      is_deleted: true, updated_at: new Date(), updated_by: ctx.userId,
    });
  }

  async getProfitability(schema: string, id: string) {
    const project = await this.db.withSchema(schema).table('projects').where({ id }).first();
    if (!project) throw new AppError('Project not found', 404);

    // Revenue: invoiced amounts linked to project
    const revenueResult = await this.db.withSchema(schema).table('invoices')
      .where({ project_id: id }).whereNot({ status: 'voided' })
      .sum('total as total_revenue').first();

    // Costs: time entries + expenses
    const timeCostResult = await this.db.withSchema(schema).table('time_entries')
      .where({ project_id: id, is_deleted: false })
      .sum('billable_amount as total_time_cost').first();

    const expenseCostResult = await this.db.withSchema(schema).table('project_expenses')
      .where({ project_id: id })
      .sum('amount as total_expense_cost').first();

    const revenue = parseFloat(revenueResult?.total_revenue || '0');
    const timeCost = parseFloat(timeCostResult?.total_time_cost || '0');
    const expenseCost = parseFloat(expenseCostResult?.total_expense_cost || '0');
    const totalCost = timeCost + expenseCost;
    const profit = revenue - totalCost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    // Hours tracking
    const hoursResult = await this.db.withSchema(schema).table('time_entries')
      .where({ project_id: id, is_deleted: false })
      .sum('duration as total_minutes').first();
    const totalHours = (parseFloat(hoursResult?.total_minutes || '0') / 60);

    return {
      revenue: revenue.toFixed(2), timeCost: timeCost.toFixed(2),
      expenseCost: expenseCost.toFixed(2), totalCost: totalCost.toFixed(2),
      profit: profit.toFixed(2), margin: margin.toFixed(1),
      totalHours: totalHours.toFixed(2), budgetAmount: project.budget_amount,
      budgetHours: project.budget_hours,
      budgetUsedPercent: project.budget_amount > 0 ? ((totalCost / project.budget_amount) * 100).toFixed(1) : '0',
      hoursUsedPercent: project.budget_hours > 0 ? ((totalHours / project.budget_hours) * 100).toFixed(1) : '0',
    };
  }

  async getBudgetStatus(schema: string, id: string) {
    return this.getProfitability(schema, id);
  }

  async listTasks(schema: string, projectId: string) {
    return this.db.withSchema(schema).table('project_tasks')
      .where({ project_id: projectId, is_deleted: false }).orderBy('sort_order');
  }

  async createTask(ctx: ServiceContext, projectId: string, data: any) {
    const id = uuidv4();
    const maxSort = await this.db.withSchema(ctx.tenantSchema).table('project_tasks')
      .where({ project_id: projectId }).max('sort_order as max').first();
    await this.db.withSchema(ctx.tenantSchema).table('project_tasks').insert({
      id, project_id: projectId, name: data.name, description: data.description,
      assigned_to: data.assignedTo, status: data.status || 'todo',
      is_billable: data.isBillable !== undefined ? data.isBillable : true,
      hourly_rate: data.hourlyRate, budget_hours: data.budgetHours,
      due_date: data.dueDate, sort_order: (maxSort?.max || 0) + 1,
      created_by: ctx.userId,
    });
    return { id };
  }

  async updateTask(ctx: ServiceContext, taskId: string, data: any) {
    const updates: Record<string, any> = { updated_at: new Date() };
    if (data.name) updates.name = data.name;
    if (data.description) updates.description = data.description;
    if (data.status) updates.status = data.status;
    if (data.assignedTo) updates.assigned_to = data.assignedTo;
    if (data.isBillable !== undefined) updates.is_billable = data.isBillable;
    if (data.hourlyRate !== undefined) updates.hourly_rate = data.hourlyRate;
    if (data.budgetHours !== undefined) updates.budget_hours = data.budgetHours;
    if (data.dueDate) updates.due_date = data.dueDate;
    await this.db.withSchema(ctx.tenantSchema).table('project_tasks').where({ id: taskId }).update(updates);
    return { id: taskId };
  }

  async deleteTask(ctx: ServiceContext, taskId: string) {
    await this.db.withSchema(ctx.tenantSchema).table('project_tasks').where({ id: taskId }).update({
      is_deleted: true, updated_at: new Date(),
    });
  }

  async listMembers(schema: string, projectId: string) {
    return this.db.withSchema(schema).table('project_members')
      .where({ project_id: projectId })
      .leftJoin('users', 'project_members.user_id', 'users.id')
      .select('project_members.*', 'users.first_name', 'users.last_name', 'users.email');
  }

  async addMember(ctx: ServiceContext, projectId: string, data: any) {
    const existing = await this.db.withSchema(ctx.tenantSchema).table('project_members')
      .where({ project_id: projectId, user_id: data.userId }).first();
    if (existing) throw new AppError('User is already a member of this project', 400);
    await this.db.withSchema(ctx.tenantSchema).table('project_members').insert({
      id: uuidv4(), project_id: projectId, user_id: data.userId,
      role: data.role || 'member', hourly_rate: data.hourlyRate,
      added_by: ctx.userId,
    });
  }

  async removeMember(ctx: ServiceContext, projectId: string, userId: string) {
    await this.db.withSchema(ctx.tenantSchema).table('project_members')
      .where({ project_id: projectId, user_id: userId }).del();
  }

  async listExpenses(schema: string, projectId: string) {
    return this.db.withSchema(schema).table('project_expenses')
      .where({ project_id: projectId }).orderBy('date', 'desc');
  }

  async addExpense(ctx: ServiceContext, projectId: string, data: any) {
    const id = uuidv4();
    await this.db.withSchema(ctx.tenantSchema).table('project_expenses').insert({
      id, project_id: projectId, description: data.description,
      amount: data.amount, date: data.date, category: data.category,
      is_billable: data.isBillable !== undefined ? data.isBillable : true,
      vendor_id: data.vendorId, receipt_url: data.receiptUrl,
      created_by: ctx.userId,
    });
    return { id };
  }
}
