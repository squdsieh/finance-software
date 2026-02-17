import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';
import { getDatabase } from '../../database/connection';
import { AppError } from '../../utils/app-error';
import { paginate } from '../../utils/pagination';
import { ServiceContext } from '../../types';

export class EstimatesService {
  private db = getDatabase();

  async list(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('estimates')
      .leftJoin(`${schema}.customers`, 'customers.id', 'estimates.customer_id')
      .where({ 'estimates.is_deleted': false })
      .select('estimates.*', 'customers.display_name as customer_name');

    if (options.status) query = query.where({ 'estimates.status': options.status });
    if (options.customerId) query = query.where({ 'estimates.customer_id': options.customerId });

    return paginate(query, {
      page: parseInt(options.page) || 1, limit: parseInt(options.limit) || 25,
      sortBy: 'estimates.estimate_date', sortOrder: 'desc',
    });
  }

  async getById(schema: string, id: string) {
    const estimate = await this.db.withSchema(schema).table('estimates')
      .where({ id, is_deleted: false }).first();
    if (!estimate) throw new AppError('Estimate not found', 404, 'NOT_FOUND');
    return estimate;
  }

  async create(ctx: ServiceContext, data: any) {
    const id = uuidv4();
    const tenant = await this.db('public.tenants').where({ id: ctx.tenantId }).first();
    const settings = tenant.settings || {};
    const prefix = settings.estimatePrefix || 'EST-';
    const nextNum = settings.estimateNextNumber || 1;

    let subtotal = new Decimal(0);
    let totalTax = new Decimal(0);

    const lineItems = (data.lineItems || []).map((item: any) => {
      const amount = new Decimal(item.quantity).times(new Decimal(item.unitRate));
      subtotal = subtotal.plus(amount);
      return item;
    });

    const totalAmount = subtotal.minus(new Decimal(data.discountAmount || '0')).plus(totalTax);

    await this.db.withSchema(ctx.tenantSchema).table('estimates').insert({
      id,
      estimate_number: `${prefix}${String(nextNum).padStart(4, '0')}`,
      customer_id: data.customerId,
      estimate_date: data.estimateDate,
      expiration_date: data.expirationDate,
      status: 'draft',
      subtotal: subtotal.toFixed(2),
      total_amount: totalAmount.toFixed(2),
      memo: data.memo,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    });

    await this.db('public.tenants').where({ id: ctx.tenantId }).update({
      settings: this.db.raw(`settings || '{"estimateNextNumber": ${nextNum + 1}}'::jsonb`),
    });

    return this.getById(ctx.tenantSchema, id);
  }

  async update(ctx: ServiceContext, id: string, data: any) {
    const updates: Record<string, any> = { updated_at: new Date(), updated_by: ctx.userId };
    if (data.expirationDate) updates.expiration_date = data.expirationDate;
    if (data.memo !== undefined) updates.memo = data.memo;

    await this.db.withSchema(ctx.tenantSchema).table('estimates').where({ id }).update(updates);
    return this.getById(ctx.tenantSchema, id);
  }

  async delete(ctx: ServiceContext, id: string) {
    await this.db.withSchema(ctx.tenantSchema).table('estimates').where({ id }).update({
      is_deleted: true, deleted_at: new Date(), updated_by: ctx.userId,
    });
  }

  async send(ctx: ServiceContext, id: string) {
    await this.db.withSchema(ctx.tenantSchema).table('estimates').where({ id }).update({
      status: 'sent', updated_at: new Date(),
    });
  }

  async convertToInvoice(ctx: ServiceContext, estimateId: string) {
    const estimate = await this.getById(ctx.tenantSchema, estimateId);
    if (estimate.status !== 'accepted') {
      throw new AppError('Only accepted estimates can be converted', 400, 'INVALID_STATUS');
    }

    // Would create invoice from estimate data here
    await this.db.withSchema(ctx.tenantSchema).table('estimates').where({ id: estimateId }).update({
      status: 'converted', updated_at: new Date(),
    });

    return { message: 'Estimate converted to invoice' };
  }

  async accept(ctx: ServiceContext, id: string, signature?: string) {
    await this.db.withSchema(ctx.tenantSchema).table('estimates').where({ id }).update({
      status: 'accepted',
      acceptance_signature: signature,
      accepted_at: new Date(),
      updated_at: new Date(),
    });
  }

  async reject(ctx: ServiceContext, id: string, reason?: string) {
    await this.db.withSchema(ctx.tenantSchema).table('estimates').where({ id }).update({
      status: 'rejected',
      rejected_at: new Date(),
      rejection_reason: reason,
      updated_at: new Date(),
    });
  }
}
