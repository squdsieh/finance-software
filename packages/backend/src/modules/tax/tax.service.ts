import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/connection';
import { AppError } from '../../utils/app-error';
import { ServiceContext } from '../../types';

export class TaxService {
  private db = getDatabase();

  // UAE VAT rate is 5%
  private readonly UAE_VAT_RATE = 5;

  async listRates(schema: string) {
    return this.db.withSchema(schema).table('tax_rates').where({ is_active: true }).orderBy('name');
  }

  async getRate(schema: string, id: string) {
    const rate = await this.db.withSchema(schema).table('tax_rates').where({ id }).first();
    if (!rate) throw new AppError('Tax rate not found', 404);
    return rate;
  }

  async createRate(ctx: ServiceContext, data: any) {
    const id = uuidv4();
    await this.db.withSchema(ctx.tenantSchema).table('tax_rates').insert({
      id, name: data.name, description: data.description,
      rate: data.rate, tax_type: data.taxType || 'vat',
      tax_agency: data.taxAgency || 'FTA',
      is_compound: data.isCompound || false, is_recoverable: data.isRecoverable !== false,
      show_on_invoices: data.showOnInvoices !== false,
      sales_account_id: data.salesAccountId, purchase_account_id: data.purchaseAccountId,
      created_by: ctx.userId, updated_by: ctx.userId,
    });
    return { id };
  }

  async updateRate(ctx: ServiceContext, id: string, data: any) {
    const updates: Record<string, any> = { updated_at: new Date(), updated_by: ctx.userId };
    if (data.name) updates.name = data.name;
    if (data.description) updates.description = data.description;
    if (data.rate !== undefined) updates.rate = data.rate;
    if (data.isActive !== undefined) updates.is_active = data.isActive;
    if (data.salesAccountId) updates.sales_account_id = data.salesAccountId;
    if (data.purchaseAccountId) updates.purchase_account_id = data.purchaseAccountId;
    await this.db.withSchema(ctx.tenantSchema).table('tax_rates').where({ id }).update(updates);
    return { id };
  }

  async deleteRate(ctx: ServiceContext, id: string) {
    // Check if rate is used in any transactions
    const usageCount = await this.db.withSchema(ctx.tenantSchema).table('invoice_lines')
      .where({ tax_rate_id: id }).count('id as count').first();
    if (parseInt(usageCount?.count as string) > 0) {
      throw new AppError('Cannot delete tax rate that is used in transactions. Deactivate it instead.', 400);
    }
    await this.db.withSchema(ctx.tenantSchema).table('tax_rates').where({ id }).update({
      is_active: false, updated_at: new Date(), updated_by: ctx.userId,
    });
  }

  async listGroups(schema: string) {
    const groups = await this.db.withSchema(schema).table('tax_groups').where({ is_active: true }).orderBy('name');
    for (const group of groups) {
      group.rates = await this.db.withSchema(schema).table('tax_group_rates')
        .where({ tax_group_id: group.id })
        .leftJoin('tax_rates', 'tax_group_rates.tax_rate_id', 'tax_rates.id')
        .select('tax_rates.*');
    }
    return groups;
  }

  async createGroup(ctx: ServiceContext, data: any) {
    const id = uuidv4();
    await this.db.withSchema(ctx.tenantSchema).table('tax_groups').insert({
      id, name: data.name, description: data.description, created_by: ctx.userId,
    });
    for (const rateId of (data.rateIds || [])) {
      await this.db.withSchema(ctx.tenantSchema).table('tax_group_rates').insert({
        id: uuidv4(), tax_group_id: id, tax_rate_id: rateId,
      });
    }
    return { id };
  }

  async updateGroup(ctx: ServiceContext, id: string, data: any) {
    if (data.name) {
      await this.db.withSchema(ctx.tenantSchema).table('tax_groups').where({ id }).update({
        name: data.name, updated_at: new Date(),
      });
    }
    if (data.rateIds) {
      await this.db.withSchema(ctx.tenantSchema).table('tax_group_rates').where({ tax_group_id: id }).del();
      for (const rateId of data.rateIds) {
        await this.db.withSchema(ctx.tenantSchema).table('tax_group_rates').insert({
          id: uuidv4(), tax_group_id: id, tax_rate_id: rateId,
        });
      }
    }
    return { id };
  }

  async deleteGroup(ctx: ServiceContext, id: string) {
    await this.db.withSchema(ctx.tenantSchema).table('tax_groups').where({ id }).update({
      is_active: false, updated_at: new Date(),
    });
  }

  async listReturns(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('vat_returns');
    if (options.year) query = query.whereRaw('EXTRACT(YEAR FROM period_start) = ?', [options.year]);
    if (options.status) query = query.where({ status: options.status });
    return query.orderBy('period_start', 'desc');
  }

  async getReturn(schema: string, id: string) {
    const taxReturn = await this.db.withSchema(schema).table('vat_returns').where({ id }).first();
    if (!taxReturn) throw new AppError('VAT return not found', 404);
    const lines = await this.db.withSchema(schema).table('vat_return_lines')
      .where({ vat_return_id: id }).orderBy('box_number');
    return { ...taxReturn, lines };
  }

  async createReturn(ctx: ServiceContext, data: any) {
    const id = uuidv4();

    // Calculate VAT boxes from transactions in the period
    const salesData = await this.db.withSchema(ctx.tenantSchema).table('invoices')
      .where('date', '>=', data.periodStart).where('date', '<=', data.periodEnd)
      .whereNot({ status: 'voided' })
      .select(
        this.db.raw('SUM(subtotal) as total_sales'),
        this.db.raw('SUM(tax_amount) as total_output_vat')
      ).first();

    const purchaseData = await this.db.withSchema(ctx.tenantSchema).table('bills')
      .where('date', '>=', data.periodStart).where('date', '<=', data.periodEnd)
      .whereNot({ status: 'voided' })
      .select(
        this.db.raw('SUM(subtotal) as total_purchases'),
        this.db.raw('SUM(tax_amount) as total_input_vat')
      ).first();

    const totalSales = parseFloat(salesData?.total_sales || '0');
    const outputVat = parseFloat(salesData?.total_output_vat || '0');
    const totalPurchases = parseFloat(purchaseData?.total_purchases || '0');
    const inputVat = parseFloat(purchaseData?.total_input_vat || '0');
    const netVat = outputVat - inputVat;

    await this.db.withSchema(ctx.tenantSchema).table('vat_returns').insert({
      id, period_start: data.periodStart, period_end: data.periodEnd,
      filing_frequency: data.filingFrequency || 'quarterly',
      total_sales: totalSales, total_output_vat: outputVat,
      total_purchases: totalPurchases, total_input_vat: inputVat,
      net_vat: netVat, amount_due: netVat > 0 ? netVat : 0,
      amount_refundable: netVat < 0 ? Math.abs(netVat) : 0,
      status: 'draft', created_by: ctx.userId, updated_by: ctx.userId,
    });

    // Create UAE FTA VAT return boxes (201 form)
    const boxes = [
      { box: '1a', label: 'Standard rated supplies in Abu Dhabi', amount: 0, vat: 0 },
      { box: '1b', label: 'Standard rated supplies in Dubai', amount: totalSales, vat: outputVat },
      { box: '1c', label: 'Standard rated supplies in Sharjah', amount: 0, vat: 0 },
      { box: '1d', label: 'Standard rated supplies in Ajman', amount: 0, vat: 0 },
      { box: '1e', label: 'Standard rated supplies in UAQ', amount: 0, vat: 0 },
      { box: '1f', label: 'Standard rated supplies in RAK', amount: 0, vat: 0 },
      { box: '1g', label: 'Standard rated supplies in Fujairah', amount: 0, vat: 0 },
      { box: '2', label: 'Tax Refunds provided to Tourists', amount: 0, vat: 0 },
      { box: '3', label: 'Supplies subject to reverse charge', amount: 0, vat: 0 },
      { box: '4', label: 'Zero-rated supplies', amount: 0, vat: 0 },
      { box: '5', label: 'Exempt supplies', amount: 0, vat: 0 },
      { box: '6', label: 'Goods imported into the UAE', amount: 0, vat: 0 },
      { box: '7', label: 'Adjustments to goods imported into UAE', amount: 0, vat: 0 },
      { box: '9', label: 'Standard rated expenses', amount: totalPurchases, vat: inputVat },
      { box: '10', label: 'Supplies subject to reverse charge', amount: 0, vat: 0 },
      { box: '11', label: 'Totals', amount: totalSales + totalPurchases, vat: netVat },
    ];

    for (const box of boxes) {
      await this.db.withSchema(ctx.tenantSchema).table('vat_return_lines').insert({
        id: uuidv4(), vat_return_id: id, box_number: box.box,
        label: box.label, amount: box.amount, vat_amount: box.vat,
      });
    }

    return { id, netVat };
  }

  async updateReturn(ctx: ServiceContext, id: string, data: any) {
    const existing = await this.db.withSchema(ctx.tenantSchema).table('vat_returns').where({ id }).first();
    if (!existing) throw new AppError('VAT return not found', 404);
    if (existing.status === 'filed') throw new AppError('Cannot update a filed return', 400);

    if (data.lines) {
      for (const line of data.lines) {
        await this.db.withSchema(ctx.tenantSchema).table('vat_return_lines')
          .where({ vat_return_id: id, box_number: line.boxNumber }).update({
            amount: line.amount, vat_amount: line.vatAmount, updated_at: new Date(),
          });
      }
    }
    const updates: Record<string, any> = { updated_at: new Date(), updated_by: ctx.userId };
    if (data.notes) updates.notes = data.notes;
    await this.db.withSchema(ctx.tenantSchema).table('vat_returns').where({ id }).update(updates);
    return { id };
  }

  async submitReturn(ctx: ServiceContext, id: string) {
    const existing = await this.db.withSchema(ctx.tenantSchema).table('vat_returns').where({ id }).first();
    if (!existing) throw new AppError('VAT return not found', 404);
    if (existing.status !== 'draft') throw new AppError('Only draft returns can be submitted', 400);
    await this.db.withSchema(ctx.tenantSchema).table('vat_returns').where({ id }).update({
      status: 'submitted', submitted_at: new Date(), submitted_by: ctx.userId, updated_at: new Date(),
    });
  }

  async fileReturn(ctx: ServiceContext, id: string) {
    const existing = await this.db.withSchema(ctx.tenantSchema).table('vat_returns').where({ id }).first();
    if (!existing) throw new AppError('VAT return not found', 404);
    if (existing.status !== 'submitted') throw new AppError('Return must be submitted before filing', 400);
    await this.db.withSchema(ctx.tenantSchema).table('vat_returns').where({ id }).update({
      status: 'filed', filed_at: new Date(), filed_by: ctx.userId, updated_at: new Date(),
    });
  }

  async validateTRN(_schema: string, trn: string) {
    if (!trn) throw new AppError('TRN is required', 400);
    // UAE TRN is 15 digits
    const isValid = /^\d{15}$/.test(trn);
    return { trn, isValid, message: isValid ? 'Valid TRN format' : 'Invalid TRN format. Must be 15 digits.' };
  }

  async exportForFTA(schema: string, returnId: string) {
    const taxReturn = await this.getReturn(schema, returnId);
    // Format data for UAE FTA submission (VAT 201 form)
    return {
      formType: 'VAT201',
      periodFrom: taxReturn.period_start,
      periodTo: taxReturn.period_end,
      boxes: taxReturn.lines.map((line: any) => ({
        boxNumber: line.box_number, label: line.label,
        amount: parseFloat(line.amount).toFixed(2),
        vatAmount: parseFloat(line.vat_amount).toFixed(2),
      })),
      netVat: parseFloat(taxReturn.net_vat).toFixed(2),
      amountDue: parseFloat(taxReturn.amount_due).toFixed(2),
    };
  }

  async taxLiabilityReport(schema: string, options: any) {
    let salesQuery = this.db.withSchema(schema).table('invoices').whereNot({ status: 'voided' });
    let purchasesQuery = this.db.withSchema(schema).table('bills').whereNot({ status: 'voided' });
    if (options.fromDate) {
      salesQuery = salesQuery.where('date', '>=', options.fromDate);
      purchasesQuery = purchasesQuery.where('date', '>=', options.fromDate);
    }
    if (options.toDate) {
      salesQuery = salesQuery.where('date', '<=', options.toDate);
      purchasesQuery = purchasesQuery.where('date', '<=', options.toDate);
    }

    const salesTax = await salesQuery.sum('tax_amount as total').first();
    const purchaseTax = await purchasesQuery.sum('tax_amount as total').first();
    const outputVat = parseFloat(salesTax?.total || '0');
    const inputVat = parseFloat(purchaseTax?.total || '0');

    return {
      outputVat: outputVat.toFixed(2),
      inputVat: inputVat.toFixed(2),
      netLiability: (outputVat - inputVat).toFixed(2),
      status: outputVat > inputVat ? 'payable' : 'refundable',
    };
  }

  async taxCollectedReport(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('invoice_lines')
      .leftJoin('invoices', 'invoice_lines.invoice_id', 'invoices.id')
      .leftJoin('tax_rates', 'invoice_lines.tax_rate_id', 'tax_rates.id')
      .whereNot({ 'invoices.status': 'voided' });
    if (options.fromDate) query = query.where('invoices.date', '>=', options.fromDate);
    if (options.toDate) query = query.where('invoices.date', '<=', options.toDate);
    return query.select(
      'tax_rates.name as tax_name', 'tax_rates.rate',
      this.db.raw('SUM(invoice_lines.amount) as taxable_amount'),
      this.db.raw('SUM(invoice_lines.tax_amount) as tax_collected')
    ).groupBy('tax_rates.name', 'tax_rates.rate');
  }

  async taxPaidReport(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('bill_lines')
      .leftJoin('bills', 'bill_lines.bill_id', 'bills.id')
      .leftJoin('tax_rates', 'bill_lines.tax_rate_id', 'tax_rates.id')
      .whereNot({ 'bills.status': 'voided' });
    if (options.fromDate) query = query.where('bills.date', '>=', options.fromDate);
    if (options.toDate) query = query.where('bills.date', '<=', options.toDate);
    return query.select(
      'tax_rates.name as tax_name', 'tax_rates.rate',
      this.db.raw('SUM(bill_lines.amount) as taxable_amount'),
      this.db.raw('SUM(bill_lines.tax_amount) as tax_paid')
    ).groupBy('tax_rates.name', 'tax_rates.rate');
  }

  async getSettings(schema: string) {
    return this.db.withSchema(schema).table('tax_settings').first() || {
      taxRegistrationNumber: '', filingFrequency: 'quarterly',
      taxMethod: 'accrual', defaultTaxRateId: null,
    };
  }

  async updateSettings(ctx: ServiceContext, data: any) {
    const existing = await this.db.withSchema(ctx.tenantSchema).table('tax_settings').first();
    const settings = {
      tax_registration_number: data.taxRegistrationNumber,
      filing_frequency: data.filingFrequency,
      tax_method: data.taxMethod, default_tax_rate_id: data.defaultTaxRateId,
      updated_at: new Date(), updated_by: ctx.userId,
    };
    if (existing) {
      await this.db.withSchema(ctx.tenantSchema).table('tax_settings').where({ id: existing.id }).update(settings);
    } else {
      await this.db.withSchema(ctx.tenantSchema).table('tax_settings').insert({ id: uuidv4(), ...settings });
    }
  }
}
