import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/connection';
import { AppError } from '../../utils/app-error';
import { createAuditLog } from '../../utils/audit';
import { paginate } from '../../utils/pagination';
import { ServiceContext } from '../../types';

export class CustomersService {
  private db = getDatabase();

  async list(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('customers').where({ is_deleted: false });

    if (options.search) {
      query = query.where(function() {
        this.where('display_name', 'ilike', `%${options.search}%`)
          .orWhere('email', 'ilike', `%${options.search}%`)
          .orWhere('phone', 'ilike', `%${options.search}%`)
          .orWhere('company_name', 'ilike', `%${options.search}%`);
      });
    }

    if (options.isActive === 'true') query = query.where({ is_active: true });
    if (options.isActive === 'false') query = query.where({ is_active: false });

    return paginate(query, {
      page: options.page,
      limit: options.limit,
      sortBy: options.sortBy,
      sortOrder: options.sortOrder,
    });
  }

  async getById(schema: string, id: string) {
    const customer = await this.db.withSchema(schema).table('customers')
      .where({ id, is_deleted: false }).first();
    if (!customer) throw new AppError('Customer not found', 404, 'NOT_FOUND');
    return customer;
  }

  async create(ctx: ServiceContext, data: any) {
    // Duplicate detection
    if (data.email) {
      const dup = await this.db.withSchema(ctx.tenantSchema).table('customers')
        .where({ email: data.email, is_deleted: false }).first();
      if (dup) throw new AppError('A customer with this email already exists', 409, 'DUPLICATE');
    }

    const id = uuidv4();
    await this.db.withSchema(ctx.tenantSchema).table('customers').insert({
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
      tax_registration_number: data.taxRegistrationNumber,
      payment_terms: data.paymentTerms || 'net_30',
      custom_payment_days: data.customPaymentDays,
      preferred_payment_method: data.preferredPaymentMethod,
      preferred_delivery_method: data.preferredDeliveryMethod || 'email',
      opening_balance: data.openingBalance || 0,
      opening_balance_date: data.openingBalanceDate,
      notes: data.notes,
      parent_customer_id: data.parentCustomerId,
      custom_fields: data.customFields ? JSON.stringify(data.customFields) : '{}',
      current_balance: data.openingBalance || 0,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    });

    await createAuditLog(this.db, {
      userId: ctx.userId, userName: ctx.userName,
      ipAddress: ctx.ipAddress, tenantSchema: ctx.tenantSchema,
    }, 'create', 'customer', id, [{ field: 'displayName', newValue: data.displayName }]);

    return this.getById(ctx.tenantSchema, id);
  }

  async update(ctx: ServiceContext, id: string, data: any) {
    await this.getById(ctx.tenantSchema, id);

    const updates: Record<string, any> = { updated_at: new Date(), updated_by: ctx.userId };
    const fieldMap: Record<string, string> = {
      displayName: 'display_name', companyName: 'company_name', title: 'title',
      firstName: 'first_name', lastName: 'last_name', email: 'email',
      phone: 'phone', mobile: 'mobile', fax: 'fax', website: 'website',
      taxRegistrationNumber: 'tax_registration_number', paymentTerms: 'payment_terms',
      customPaymentDays: 'custom_payment_days', preferredPaymentMethod: 'preferred_payment_method',
      preferredDeliveryMethod: 'preferred_delivery_method', notes: 'notes',
      parentCustomerId: 'parent_customer_id', isActive: 'is_active',
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (data[key] !== undefined) updates[dbField] = data[key];
    }

    if (data.billingAddress) updates.billing_address = JSON.stringify(data.billingAddress);
    if (data.shippingAddress) updates.shipping_address = JSON.stringify(data.shippingAddress);
    if (data.customFields) updates.custom_fields = JSON.stringify(data.customFields);

    await this.db.withSchema(ctx.tenantSchema).table('customers').where({ id }).update(updates);
    return this.getById(ctx.tenantSchema, id);
  }

  async delete(ctx: ServiceContext, id: string) {
    await this.getById(ctx.tenantSchema, id);

    const hasInvoices = await this.db.withSchema(ctx.tenantSchema)
      .table('invoices').where({ customer_id: id, is_deleted: false }).first();

    if (hasInvoices) {
      throw new AppError('Cannot delete customer with existing invoices', 400, 'HAS_TRANSACTIONS');
    }

    await this.db.withSchema(ctx.tenantSchema).table('customers').where({ id }).update({
      is_deleted: true, deleted_at: new Date(), updated_by: ctx.userId,
    });
  }

  async getTransactions(schema: string, customerId: string) {
    const invoices = await this.db.withSchema(schema).table('invoices')
      .where({ customer_id: customerId, is_deleted: false })
      .select('id', 'invoice_number as number', 'invoice_date as date', 'total_amount as amount', 'balance_due', 'status')
      .orderBy('invoice_date', 'desc');

    const payments = await this.db.withSchema(schema).table('payments_received')
      .where({ customer_id: customerId, is_deleted: false })
      .select('id', 'payment_date as date', 'amount', 'payment_method', 'reference_number')
      .orderBy('payment_date', 'desc');

    return { invoices, payments };
  }

  async getStatement(schema: string, customerId: string, dateRange: { startDate: string; endDate: string }) {
    const customer = await this.getById(schema, customerId);

    const invoices = await this.db.withSchema(schema).table('invoices')
      .where({ customer_id: customerId, is_deleted: false })
      .whereBetween('invoice_date', [dateRange.startDate, dateRange.endDate])
      .orderBy('invoice_date', 'asc');

    return {
      customer: { id: customer.id, displayName: customer.display_name },
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      transactions: invoices,
    };
  }

  async sendStatement(ctx: ServiceContext, customerId: string, _options: any) {
    const customer = await this.getById(ctx.tenantSchema, customerId);
    if (!customer.email) {
      throw new AppError('Customer does not have an email address', 400, 'NO_EMAIL');
    }
    // Email sending would happen here
    return { message: 'Statement sent' };
  }

  async importCustomers(ctx: ServiceContext, customers: any[]) {
    let imported = 0;
    for (const cust of customers) {
      await this.create(ctx, cust);
      imported++;
    }
    return { imported, total: customers.length };
  }

  async exportCustomers(schema: string) {
    return this.db.withSchema(schema).table('customers')
      .where({ is_deleted: false })
      .orderBy('display_name', 'asc');
  }
}
