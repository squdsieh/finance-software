import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';
import { getDatabase } from '../../database/connection';
import { AppError } from '../../utils/app-error';
import { createAuditLog } from '../../utils/audit';
import { paginate } from '../../utils/pagination';
import { ServiceContext } from '../../types';

export class ExpensesService {
  private db = getDatabase();

  async list(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('expenses').where({ is_deleted: false });
    if (options.startDate) query = query.where('date', '>=', options.startDate);
    if (options.endDate) query = query.where('date', '<=', options.endDate);
    if (options.vendorId) query = query.where({ vendor_id: options.vendorId });

    return paginate(query, {
      page: parseInt(options.page) || 1, limit: parseInt(options.limit) || 25,
      sortBy: 'date', sortOrder: 'desc',
    });
  }

  async getById(schema: string, id: string) {
    const expense = await this.db.withSchema(schema).table('expenses')
      .where({ id, is_deleted: false }).first();
    if (!expense) throw new AppError('Expense not found', 404, 'NOT_FOUND');

    const lineItems = await this.db.withSchema(schema).table('expense_line_items')
      .where({ expense_id: id }).orderBy('sort_order', 'asc');

    return { ...expense, lineItems };
  }

  async create(ctx: ServiceContext, data: any) {
    const id = uuidv4();
    let totalAmount = new Decimal(0);

    const lineItems = (data.lineItems || []).map((item: any, index: number) => {
      totalAmount = totalAmount.plus(new Decimal(item.amount));
      return {
        id: uuidv4(), expense_id: id, category_account_id: item.categoryAccountId,
        description: item.description, amount: item.amount,
        tax_code_id: item.taxCodeId, tax_amount: item.taxAmount || '0',
        is_billable: item.isBillable || false, customer_id: item.customerId,
        project_id: item.projectId, sort_order: index,
      };
    });

    await this.db.transaction(async (trx) => {
      await trx.withSchema(ctx.tenantSchema).table('expenses').insert({
        id, date: data.date, payment_account_id: data.paymentAccountId,
        payment_method: data.paymentMethod, vendor_id: data.vendorId,
        total_amount: data.totalAmount || totalAmount.toFixed(2),
        currency: data.currency || 'AED', memo: data.memo,
        is_billable: data.isBillable || false, customer_id: data.customerId,
        project_id: data.projectId, class_id: data.classId,
        location_id: data.locationId,
        created_by: ctx.userId, updated_by: ctx.userId,
      });

      if (lineItems.length > 0) {
        await trx.withSchema(ctx.tenantSchema).table('expense_line_items').insert(lineItems);
      }
    });

    await createAuditLog(this.db, {
      userId: ctx.userId, userName: ctx.userName,
      ipAddress: ctx.ipAddress, tenantSchema: ctx.tenantSchema,
    }, 'create', 'expense', id, [{ field: 'amount', newValue: totalAmount.toFixed(2) }]);

    return this.getById(ctx.tenantSchema, id);
  }

  async update(ctx: ServiceContext, id: string, data: any) {
    const updates: Record<string, any> = { updated_at: new Date(), updated_by: ctx.userId };
    if (data.date) updates.date = data.date;
    if (data.memo !== undefined) updates.memo = data.memo;
    if (data.vendorId !== undefined) updates.vendor_id = data.vendorId;

    await this.db.withSchema(ctx.tenantSchema).table('expenses').where({ id }).update(updates);
    return this.getById(ctx.tenantSchema, id);
  }

  async delete(ctx: ServiceContext, id: string) {
    await this.db.withSchema(ctx.tenantSchema).table('expenses').where({ id }).update({
      is_deleted: true, deleted_at: new Date(), updated_by: ctx.userId,
    });
  }

  async scanReceipt(_ctx: ServiceContext, _data: any) {
    // OCR integration with Google Cloud Vision would go here
    return {
      vendorName: 'Detected Vendor',
      date: new Date().toISOString().split('T')[0],
      totalAmount: '0.00',
      suggestedCategory: null,
      confidence: 0,
      rawText: 'OCR processing placeholder',
    };
  }

  async createMileage(ctx: ServiceContext, data: any) {
    const id = uuidv4();
    const distance = new Decimal(data.distance);
    const rate = new Decimal(data.ratePerUnit || '0.655');
    const totalAmount = distance.times(rate).toFixed(2);

    await this.db.withSchema(ctx.tenantSchema).table('mileage_entries').insert({
      id, date: data.date, start_location: data.startLocation,
      end_location: data.endLocation, distance: data.distance,
      unit: data.unit || 'km', rate_per_unit: rate.toFixed(4),
      total_amount: totalAmount, purpose: data.purpose,
      vehicle: data.vehicle, is_billable: data.isBillable || false,
      customer_id: data.customerId, project_id: data.projectId,
      created_by: ctx.userId, updated_by: ctx.userId,
    });

    return { id, totalAmount };
  }

  async listClaims(schema: string, options: any) {
    return this.db.withSchema(schema).table('expense_claims')
      .where({ is_deleted: false })
      .orderBy('created_at', 'desc');
  }

  async createClaim(ctx: ServiceContext, data: any) {
    const id = uuidv4();
    await this.db.withSchema(ctx.tenantSchema).table('expense_claims').insert({
      id, employee_id: data.employeeId, title: data.title,
      total_amount: data.totalAmount || '0',
      created_by: ctx.userId, updated_by: ctx.userId,
    });
    return { id };
  }

  async submitClaim(ctx: ServiceContext, id: string) {
    await this.db.withSchema(ctx.tenantSchema).table('expense_claims').where({ id }).update({
      status: 'submitted', submitted_at: new Date(), updated_at: new Date(),
    });
  }

  async approveClaim(ctx: ServiceContext, id: string) {
    await this.db.withSchema(ctx.tenantSchema).table('expense_claims').where({ id }).update({
      status: 'approved', reviewed_by: ctx.userId,
      reviewed_at: new Date(), updated_at: new Date(),
    });
  }

  async rejectClaim(ctx: ServiceContext, id: string, comments?: string) {
    await this.db.withSchema(ctx.tenantSchema).table('expense_claims').where({ id }).update({
      status: 'rejected', reviewed_by: ctx.userId, reviewed_at: new Date(),
      review_comments: comments, updated_at: new Date(),
    });
  }

  async invoiceBillableExpenses(ctx: ServiceContext, customerId: string) {
    if (!customerId) throw new AppError('customerId is required', 400);

    const schema = ctx.tenantSchema;
    const lineItems = await this.db.withSchema(schema).table('expense_line_items as eli')
      .join(`${schema}.expenses as e`, 'e.id', 'eli.expense_id')
      .leftJoin(`${schema}.vendors as v`, 'v.id', 'e.vendor_id')
      .where('eli.is_billable', true)
      .where('eli.customer_id', customerId)
      .where('e.is_deleted', false)
      .select(
        'eli.id as line_item_id',
        'eli.expense_id',
        'eli.description',
        'eli.amount',
        'eli.tax_code_id',
        'eli.tax_amount',
        'eli.project_id',
        'e.date',
        'e.currency',
        'e.vendor_id',
        'v.display_name as vendor_name',
      )
      .orderBy('e.date', 'asc');

    const totalAmount = lineItems.reduce(
      (sum, item) => sum.plus(new Decimal(item.amount || 0)),
      new Decimal(0),
    );

    return {
      customerId,
      count: lineItems.length,
      totalAmount: totalAmount.toFixed(2),
      lineItems,
    };
  }
}
