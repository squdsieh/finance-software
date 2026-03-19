import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';
import { getDatabase } from '../../database/connection';
import { AppError } from '../../utils/app-error';
import { createAuditLog } from '../../utils/audit';
import { paginate } from '../../utils/pagination';
import { sendEmail, compileTemplate, EMAIL_TEMPLATES } from '../../utils/email';
import { ServiceContext } from '../../types';

export class InvoicesService {
  private db = getDatabase();

  async list(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('invoices')
      .leftJoin(`${schema}.customers`, 'customers.id', 'invoices.customer_id')
      .where({ 'invoices.is_deleted': false })
      .select('invoices.*', 'customers.display_name as customer_name');

    if (options.status) query = query.where({ 'invoices.status': options.status });
    if (options.customerId) query = query.where({ 'invoices.customer_id': options.customerId });
    if (options.startDate) query = query.where('invoices.invoice_date', '>=', options.startDate);
    if (options.endDate) query = query.where('invoices.invoice_date', '<=', options.endDate);
    if (options.search) {
      query = query.where(function() {
        this.where('invoices.invoice_number', 'ilike', `%${options.search}%`)
          .orWhere('customers.display_name', 'ilike', `%${options.search}%`);
      });
    }

    return paginate(query, {
      page: options.page, limit: options.limit,
      sortBy: 'invoices.invoice_date', sortOrder: 'desc',
    });
  }

  async getById(schema: string, id: string) {
    const invoice = await this.db.withSchema(schema).table('invoices')
      .leftJoin(`${schema}.customers`, 'customers.id', 'invoices.customer_id')
      .where({ 'invoices.id': id, 'invoices.is_deleted': false })
      .select('invoices.*', 'customers.display_name as customer_name')
      .first();

    if (!invoice) throw new AppError('Invoice not found', 404, 'NOT_FOUND');

    const lineItems = await this.db.withSchema(schema).table('invoice_line_items')
      .where({ invoice_id: id }).orderBy('sort_order', 'asc');

    const payments = await this.db.withSchema(schema).table('payment_allocations')
      .join(`${schema}.payments_received`, 'payments_received.id', 'payment_allocations.payment_id')
      .where({ 'payment_allocations.invoice_id': id })
      .select('payments_received.*', 'payment_allocations.amount as allocated_amount');

    return { ...invoice, lineItems, payments };
  }

  async create(ctx: ServiceContext, data: any) {
    const id = uuidv4();

    // Get next invoice number
    const tenant = await this.db('public.tenants').where({ id: ctx.tenantId }).first();
    const settings = tenant.settings || {};
    const prefix = settings.invoicePrefix || 'INV-';
    const nextNum = settings.invoiceNextNumber || 1;
    const invoiceNumber = `${prefix}${String(nextNum).padStart(4, '0')}`;

    // Calculate totals
    let subtotal = new Decimal(0);
    let totalTax = new Decimal(0);

    const lineItems = data.lineItems.map((item: any, index: number) => {
      const qty = new Decimal(item.quantity);
      const rate = new Decimal(item.unitRate);
      const lineAmount = qty.times(rate).toFixed(2);
      const lineTax = item.taxCodeId ? new Decimal(lineAmount).times(new Decimal('0.05')).toFixed(2) : '0';

      subtotal = subtotal.plus(lineAmount);
      totalTax = totalTax.plus(lineTax);

      return {
        id: uuidv4(),
        invoice_id: id,
        product_id: item.productId,
        description: item.description,
        quantity: item.quantity,
        unit_rate: item.unitRate,
        amount: lineAmount,
        tax_code_id: item.taxCodeId,
        tax_amount: lineTax,
        class_id: item.classId,
        location_id: item.locationId,
        project_id: item.projectId,
        sort_order: index,
      };
    });

    // Calculate discount
    let discountAmount = new Decimal(0);
    if (data.discountType === 'percentage' && data.discountValue) {
      discountAmount = subtotal.times(new Decimal(data.discountValue)).dividedBy(100);
    } else if (data.discountType === 'fixed' && data.discountValue) {
      discountAmount = new Decimal(data.discountValue);
    }

    const shipping = new Decimal(data.shippingAmount || '0');
    const totalAmount = subtotal.minus(discountAmount).plus(totalTax).plus(shipping);
    const balanceDue = totalAmount.minus(new Decimal(data.depositAmount || '0'));

    await this.db.transaction(async (trx) => {
      await trx.withSchema(ctx.tenantSchema).table('invoices').insert({
        id,
        invoice_number: invoiceNumber,
        customer_id: data.customerId,
        invoice_date: data.invoiceDate,
        due_date: data.dueDate,
        po_number: data.poNumber,
        status: 'draft',
        currency: data.currency || 'AED',
        exchange_rate: data.exchangeRate || 1,
        subtotal: subtotal.toFixed(2),
        discount_type: data.discountType,
        discount_value: data.discountValue,
        discount_amount: discountAmount.toFixed(2),
        tax_amount: totalTax.toFixed(2),
        shipping_amount: shipping.toFixed(2),
        total_amount: totalAmount.toFixed(2),
        amount_paid: data.depositAmount || 0,
        balance_due: balanceDue.toFixed(2),
        deposit_amount: data.depositAmount,
        memo: data.memo,
        private_notes: data.privateNotes,
        online_payment_enabled: data.onlinePaymentEnabled !== false,
        project_id: data.projectId,
        class_id: data.classId,
        location_id: data.locationId,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      });

      await trx.withSchema(ctx.tenantSchema).table('invoice_line_items').insert(lineItems);

      // Update invoice sequence number
      await trx('public.tenants').where({ id: ctx.tenantId }).update({
        settings: this.db.raw(`settings || '{"invoiceNextNumber": ${nextNum + 1}}'::jsonb`),
      });
    });

    await createAuditLog(this.db, {
      userId: ctx.userId, userName: ctx.userName,
      ipAddress: ctx.ipAddress, tenantSchema: ctx.tenantSchema,
    }, 'create', 'invoice', id, [
      { field: 'invoiceNumber', newValue: invoiceNumber },
      { field: 'totalAmount', newValue: totalAmount.toFixed(2) },
    ]);

    return this.getById(ctx.tenantSchema, id);
  }

  async update(ctx: ServiceContext, id: string, data: any) {
    const existing = await this.getById(ctx.tenantSchema, id);
    if (existing.status === 'paid' || existing.status === 'voided') {
      throw new AppError('Cannot edit a paid or voided invoice', 400, 'INVALID_STATUS');
    }

    const updates: Record<string, any> = { updated_at: new Date(), updated_by: ctx.userId };
    if (data.dueDate) updates.due_date = data.dueDate;
    if (data.poNumber !== undefined) updates.po_number = data.poNumber;
    if (data.memo !== undefined) updates.memo = data.memo;
    if (data.privateNotes !== undefined) updates.private_notes = data.privateNotes;

    if (data.lineItems) {
      // Recalculate
      let subtotal = new Decimal(0);
      let totalTax = new Decimal(0);

      await this.db.withSchema(ctx.tenantSchema).table('invoice_line_items')
        .where({ invoice_id: id }).delete();

      const lineItems = data.lineItems.map((item: any, index: number) => {
        const amount = new Decimal(item.quantity).times(new Decimal(item.unitRate)).toFixed(2);
        const tax = item.taxCodeId ? new Decimal(amount).times('0.05').toFixed(2) : '0';
        subtotal = subtotal.plus(amount);
        totalTax = totalTax.plus(tax);

        return {
          id: uuidv4(), invoice_id: id, product_id: item.productId,
          description: item.description, quantity: item.quantity,
          unit_rate: item.unitRate, amount, tax_code_id: item.taxCodeId,
          tax_amount: tax, sort_order: index,
        };
      });

      await this.db.withSchema(ctx.tenantSchema).table('invoice_line_items').insert(lineItems);

      let discountAmount = new Decimal(0);
      if (data.discountType === 'percentage' && data.discountValue) {
        discountAmount = subtotal.times(data.discountValue).dividedBy(100);
      } else if (data.discountType === 'fixed' && data.discountValue) {
        discountAmount = new Decimal(data.discountValue);
      }

      const total = subtotal.minus(discountAmount).plus(totalTax).plus(new Decimal(data.shippingAmount || '0'));
      updates.subtotal = subtotal.toFixed(2);
      updates.tax_amount = totalTax.toFixed(2);
      updates.discount_amount = discountAmount.toFixed(2);
      updates.total_amount = total.toFixed(2);
      updates.balance_due = total.minus(new Decimal(existing.amount_paid || '0')).toFixed(2);
    }

    await this.db.withSchema(ctx.tenantSchema).table('invoices').where({ id }).update(updates);
    return this.getById(ctx.tenantSchema, id);
  }

  async delete(ctx: ServiceContext, id: string) {
    const invoice = await this.getById(ctx.tenantSchema, id);
    if (invoice.status !== 'draft') {
      throw new AppError('Only draft invoices can be deleted', 400, 'INVALID_STATUS');
    }
    await this.db.withSchema(ctx.tenantSchema).table('invoices').where({ id }).update({
      is_deleted: true, deleted_at: new Date(), updated_by: ctx.userId,
    });
  }

  async sendInvoice(ctx: ServiceContext, id: string, emailOptions: any) {
    const invoice = await this.getById(ctx.tenantSchema, id);
    const customer = await this.db.withSchema(ctx.tenantSchema).table('customers')
      .where({ id: invoice.customer_id }).first();

    if (!customer.email) {
      throw new AppError('Customer does not have an email address', 400, 'NO_EMAIL');
    }

    await sendEmail({
      to: customer.email,
      subject: emailOptions?.subject || `Invoice ${invoice.invoice_number}`,
      html: compileTemplate(EMAIL_TEMPLATES.invoiceEmail, {
        customerName: customer.display_name,
        invoiceNumber: invoice.invoice_number,
        amountDue: invoice.balance_due,
        dueDate: invoice.due_date,
        paymentLink: invoice.payment_link,
        memo: invoice.memo,
      }),
      cc: emailOptions?.cc,
      bcc: emailOptions?.bcc,
    });

    await this.db.withSchema(ctx.tenantSchema).table('invoices').where({ id }).update({
      status: 'sent', email_status: 'sent', updated_at: new Date(),
    });
  }

  async recordPayment(ctx: ServiceContext, data: any) {
    const invoice = await this.getById(ctx.tenantSchema, data.invoiceId);
    if (invoice.status === 'paid' || invoice.status === 'voided') {
      throw new AppError('Cannot record payment on this invoice', 400, 'INVALID_STATUS');
    }

    const paymentAmount = new Decimal(data.amount);
    const currentBalance = new Decimal(invoice.balance_due);

    if (paymentAmount.greaterThan(currentBalance)) {
      throw new AppError('Payment amount exceeds balance due', 400, 'OVERPAYMENT');
    }

    const paymentId = uuidv4();
    const newBalance = currentBalance.minus(paymentAmount);
    const newStatus = newBalance.isZero() ? 'paid' : 'partially_paid';

    await this.db.transaction(async (trx) => {
      await trx.withSchema(ctx.tenantSchema).table('payments_received').insert({
        id: paymentId,
        customer_id: invoice.customer_id,
        payment_date: data.paymentDate,
        amount: data.amount,
        payment_method: data.paymentMethod,
        reference_number: data.referenceNumber,
        deposit_account_id: data.depositAccountId,
        memo: data.memo,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      });

      await trx.withSchema(ctx.tenantSchema).table('payment_allocations').insert({
        id: uuidv4(),
        payment_id: paymentId,
        invoice_id: data.invoiceId,
        amount: data.amount,
      });

      await trx.withSchema(ctx.tenantSchema).table('invoices').where({ id: data.invoiceId }).update({
        amount_paid: new Decimal(invoice.amount_paid).plus(paymentAmount).toFixed(2),
        balance_due: newBalance.toFixed(2),
        status: newStatus,
        updated_at: new Date(),
      });

      // Create journal entry for payment
      const jeId = uuidv4();
      const tenant = await trx('public.tenants').where({ id: ctx.tenantId }).first();
      const jeSettings = tenant.settings || {};
      const jePrefix = jeSettings.journalEntryPrefix || 'JE-';
      const jeNextNum = jeSettings.journalEntryNextNumber || 1;

      await trx.withSchema(ctx.tenantSchema).table('journal_entries').insert({
        id: jeId,
        entry_number: `${jePrefix}${String(jeNextNum).padStart(4, '0')}`,
        date: data.paymentDate,
        memo: `Payment received for ${invoice.invoice_number}`,
        source_type: 'payment',
        source_id: paymentId,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      });

      // Debit deposit account, credit A/R
      await trx.withSchema(ctx.tenantSchema).table('journal_entry_lines').insert([
        {
          id: uuidv4(), journal_entry_id: jeId,
          account_id: data.depositAccountId,
          debit_amount: data.amount, credit_amount: 0,
          description: `Payment for ${invoice.invoice_number}`,
          customer_id: invoice.customer_id, sort_order: 0,
        },
        {
          id: uuidv4(), journal_entry_id: jeId,
          account_id: data.depositAccountId, // Would be A/R account
          debit_amount: 0, credit_amount: data.amount,
          description: `Payment for ${invoice.invoice_number}`,
          customer_id: invoice.customer_id, sort_order: 1,
        },
      ]);

      await trx('public.tenants').where({ id: ctx.tenantId }).update({
        settings: this.db.raw(`settings || '{"journalEntryNextNumber": ${jeNextNum + 1}}'::jsonb`),
      });
    });

    return { id: paymentId, amount: data.amount, status: newStatus };
  }

  async voidInvoice(ctx: ServiceContext, id: string) {
    const invoice = await this.getById(ctx.tenantSchema, id);
    if (invoice.status === 'voided') {
      throw new AppError('Invoice is already voided', 400, 'ALREADY_VOIDED');
    }

    await this.db.withSchema(ctx.tenantSchema).table('invoices').where({ id }).update({
      status: 'voided', updated_at: new Date(), updated_by: ctx.userId,
    });

    await createAuditLog(this.db, {
      userId: ctx.userId, userName: ctx.userName,
      ipAddress: ctx.ipAddress, tenantSchema: ctx.tenantSchema,
    }, 'update', 'invoice', id, [{ field: 'status', oldValue: invoice.status, newValue: 'voided' }]);
  }

  async duplicate(ctx: ServiceContext, sourceId: string) {
    const source = await this.getById(ctx.tenantSchema, sourceId);
    const newData = {
      customerId: source.customer_id,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: source.due_date,
      lineItems: source.lineItems.map((item: any) => ({
        productId: item.product_id,
        description: item.description,
        quantity: String(item.quantity),
        unitRate: String(item.unit_rate),
        taxCodeId: item.tax_code_id,
      })),
      memo: source.memo,
      privateNotes: source.private_notes,
    };
    return this.create(ctx, newData);
  }

  async createCreditMemo(ctx: ServiceContext, invoiceId: string, data: any) {
    const invoice = await this.getById(ctx.tenantSchema, invoiceId);
    const id = uuidv4();

    await this.db.withSchema(ctx.tenantSchema).table('credit_memos').insert({
      id,
      credit_memo_number: `CM-${Date.now()}`,
      customer_id: invoice.customer_id,
      date: new Date().toISOString().split('T')[0],
      invoice_id: invoiceId,
      total_amount: data.amount || invoice.total_amount,
      remaining_balance: data.amount || invoice.total_amount,
      memo: data.memo,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    });

    return { id, message: 'Credit memo created' };
  }

  async generatePdf(_schema: string, _id: string) {
    // PDF generation would use puppeteer or jsPDF
    return Buffer.from('PDF generation placeholder');
  }

  async listRecurringTemplates(schema: string) {
    return this.db.withSchema(schema).table('recurring_templates')
      .where({ template_type: 'invoice' })
      .orderBy('created_at', 'desc');
  }

  async createRecurringTemplate(ctx: ServiceContext, data: any) {
    const id = uuidv4();
    await this.db.withSchema(ctx.tenantSchema).table('recurring_templates').insert({
      id,
      template_type: 'invoice',
      customer_id: data.customerId,
      frequency: data.frequency,
      day_of_month: data.dayOfMonth,
      start_date: data.startDate,
      end_date: data.endDate,
      max_occurrences: data.maxOccurrences,
      auto_send: data.autoSend || false,
      days_before_due_date: data.daysBeforeDueDate || 0,
      next_generation_date: data.startDate,
      template_data: JSON.stringify(data.templateData),
      created_by: ctx.userId,
      updated_by: ctx.userId,
    });
    return { id };
  }

  async updateRecurringTemplate(ctx: ServiceContext, id: string, data: any) {
    const updates: Record<string, any> = { updated_at: new Date(), updated_by: ctx.userId };
    if (data.frequency) updates.frequency = data.frequency;
    if (data.endDate !== undefined) updates.end_date = data.endDate;
    if (data.autoSend !== undefined) updates.auto_send = data.autoSend;
    if (data.templateData) updates.template_data = JSON.stringify(data.templateData);

    await this.db.withSchema(ctx.tenantSchema).table('recurring_templates').where({ id }).update(updates);
    return { id };
  }

  async deleteRecurringTemplate(_ctx: ServiceContext, _id: string) {
    // Soft delete would go here
  }

  async toggleRecurringTemplate(ctx: ServiceContext, id: string, pause: boolean) {
    await this.db.withSchema(ctx.tenantSchema).table('recurring_templates')
      .where({ id }).update({ is_paused: pause, updated_at: new Date(), updated_by: ctx.userId });
  }
}
