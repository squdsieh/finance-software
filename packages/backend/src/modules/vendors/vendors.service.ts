import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/connection';
import { AppError } from '../../utils/app-error';
import { createAuditLog } from '../../utils/audit';
import { paginate } from '../../utils/pagination';
import { ServiceContext } from '../../types';

export class VendorsService {
  private db = getDatabase();

  async list(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('vendors').where({ is_deleted: false });
    if (options.search) {
      query = query.where(function() {
        this.where('display_name', 'ilike', `%${options.search}%`)
          .orWhere('email', 'ilike', `%${options.search}%`)
          .orWhere('company_name', 'ilike', `%${options.search}%`);
      });
    }
    return paginate(query, options);
  }

  async getById(schema: string, id: string) {
    const vendor = await this.db.withSchema(schema).table('vendors')
      .where({ id, is_deleted: false }).first();
    if (!vendor) throw new AppError('Vendor not found', 404, 'NOT_FOUND');
    return vendor;
  }

  async create(ctx: ServiceContext, data: any) {
    const id = uuidv4();
    await this.db.withSchema(ctx.tenantSchema).table('vendors').insert({
      id,
      display_name: data.displayName,
      company_name: data.companyName,
      title: data.title,
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone: data.phone,
      mobile: data.mobile,
      fax: data.fax,
      website: data.website,
      billing_address: data.billingAddress ? JSON.stringify(data.billingAddress) : '{}',
      shipping_address: data.shippingAddress ? JSON.stringify(data.shippingAddress) : '{}',
      vendor_account_number: data.vendorAccountNumber,
      is_1099_eligible: data.is1099Eligible || false,
      tax_id: data.taxId,
      default_expense_account_id: data.defaultExpenseAccountId,
      business_id_number: data.businessIdNumber,
      payment_terms: data.paymentTerms || 'net_30',
      preferred_payment_method: data.preferredPaymentMethod,
      opening_balance: data.openingBalance || 0,
      notes: data.notes,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    });

    await createAuditLog(this.db, {
      userId: ctx.userId, userName: ctx.userName,
      ipAddress: ctx.ipAddress, tenantSchema: ctx.tenantSchema,
    }, 'create', 'vendor', id, [{ field: 'displayName', newValue: data.displayName }]);

    return this.getById(ctx.tenantSchema, id);
  }

  async update(ctx: ServiceContext, id: string, data: any) {
    await this.getById(ctx.tenantSchema, id);
    const updates: Record<string, any> = { updated_at: new Date(), updated_by: ctx.userId };

    const fieldMap: Record<string, string> = {
      displayName: 'display_name', companyName: 'company_name', email: 'email',
      phone: 'phone', mobile: 'mobile', website: 'website',
      vendorAccountNumber: 'vendor_account_number', is1099Eligible: 'is_1099_eligible',
      taxId: 'tax_id', defaultExpenseAccountId: 'default_expense_account_id',
      paymentTerms: 'payment_terms', notes: 'notes', isActive: 'is_active',
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (data[key] !== undefined) updates[dbField] = data[key];
    }

    if (data.billingAddress) updates.billing_address = JSON.stringify(data.billingAddress);
    if (data.shippingAddress) updates.shipping_address = JSON.stringify(data.shippingAddress);

    await this.db.withSchema(ctx.tenantSchema).table('vendors').where({ id }).update(updates);
    return this.getById(ctx.tenantSchema, id);
  }

  async delete(ctx: ServiceContext, id: string) {
    const hasBills = await this.db.withSchema(ctx.tenantSchema)
      .table('bills').where({ vendor_id: id, is_deleted: false }).first();
    if (hasBills) throw new AppError('Cannot delete vendor with existing bills', 400, 'HAS_TRANSACTIONS');

    await this.db.withSchema(ctx.tenantSchema).table('vendors').where({ id }).update({
      is_deleted: true, deleted_at: new Date(), updated_by: ctx.userId,
    });
  }

  async getTransactions(schema: string, vendorId: string) {
    const bills = await this.db.withSchema(schema).table('bills')
      .where({ vendor_id: vendorId, is_deleted: false })
      .orderBy('bill_date', 'desc');
    return { bills };
  }

  async importVendors(ctx: ServiceContext, vendors: any[]) {
    let imported = 0;
    for (const v of vendors) { await this.create(ctx, v); imported++; }
    return { imported, total: vendors.length };
  }

  async exportVendors(schema: string) {
    return this.db.withSchema(schema).table('vendors')
      .where({ is_deleted: false }).orderBy('display_name', 'asc');
  }
}
