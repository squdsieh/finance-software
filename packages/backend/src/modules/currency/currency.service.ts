import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/connection';
import { AppError } from '../../utils/app-error';
import { ServiceContext } from '../../types';

export class CurrencyService {
  private db = getDatabase();

  async list(schema: string) {
    return this.db.withSchema(schema).table('currencies').where({ is_active: true }).orderBy('code');
  }

  async create(ctx: ServiceContext, data: any) {
    const id = uuidv4();
    const existing = await this.db.withSchema(ctx.tenantSchema).table('currencies')
      .where({ code: data.code }).first();
    if (existing) throw new AppError('Currency already exists', 400);

    await this.db.withSchema(ctx.tenantSchema).table('currencies').insert({
      id, code: data.code.toUpperCase(), name: data.name, symbol: data.symbol,
      decimal_places: data.decimalPlaces ?? 2,
      is_base: data.isBase || false, exchange_rate: data.exchangeRate || 1,
      created_by: ctx.userId,
    });
    return { id };
  }

  async update(ctx: ServiceContext, id: string, data: any) {
    const updates: Record<string, any> = { updated_at: new Date() };
    if (data.name) updates.name = data.name;
    if (data.symbol) updates.symbol = data.symbol;
    if (data.exchangeRate) updates.exchange_rate = data.exchangeRate;
    if (data.isActive !== undefined) updates.is_active = data.isActive;
    await this.db.withSchema(ctx.tenantSchema).table('currencies').where({ id }).update(updates);
    return { id };
  }

  async delete(ctx: ServiceContext, id: string) {
    const currency = await this.db.withSchema(ctx.tenantSchema).table('currencies').where({ id }).first();
    if (!currency) throw new AppError('Currency not found', 404);
    if (currency.is_base) throw new AppError('Cannot delete base currency', 400);

    // Check usage
    const invoiceCount = await this.db.withSchema(ctx.tenantSchema).table('invoices')
      .where({ currency: currency.code }).count('id as count').first();
    if (parseInt(invoiceCount?.count as string) > 0) {
      throw new AppError('Currency is used in transactions. Deactivate instead.', 400);
    }

    await this.db.withSchema(ctx.tenantSchema).table('currencies').where({ id }).update({
      is_active: false, updated_at: new Date(),
    });
  }

  async listRates(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('exchange_rates');
    if (options.fromCurrency) query = query.where({ from_currency: options.fromCurrency });
    if (options.toCurrency) query = query.where({ to_currency: options.toCurrency });
    if (options.fromDate) query = query.where('effective_date', '>=', options.fromDate);
    if (options.toDate) query = query.where('effective_date', '<=', options.toDate);
    return query.orderBy('effective_date', 'desc').limit(100);
  }

  async createRate(ctx: ServiceContext, data: any) {
    const id = uuidv4();
    await this.db.withSchema(ctx.tenantSchema).table('exchange_rates').insert({
      id, from_currency: data.fromCurrency.toUpperCase(),
      to_currency: data.toCurrency.toUpperCase(),
      rate: data.rate, effective_date: data.effectiveDate || new Date(),
      source: data.source || 'manual', created_by: ctx.userId,
    });

    // Update currency table with latest rate
    await this.db.withSchema(ctx.tenantSchema).table('currencies')
      .where({ code: data.fromCurrency.toUpperCase() })
      .update({ exchange_rate: data.rate, updated_at: new Date() });

    return { id };
  }

  async updateRate(ctx: ServiceContext, id: string, data: any) {
    const updates: Record<string, any> = { updated_at: new Date() };
    if (data.rate) updates.rate = data.rate;
    if (data.effectiveDate) updates.effective_date = data.effectiveDate;
    await this.db.withSchema(ctx.tenantSchema).table('exchange_rates').where({ id }).update(updates);
    return { id };
  }

  async syncRates(ctx: ServiceContext) {
    // Placeholder for external API integration (e.g., Central Bank of UAE, Open Exchange Rates)
    const baseCurrency = await this.db.withSchema(ctx.tenantSchema).table('currencies')
      .where({ is_base: true }).first();
    if (!baseCurrency) throw new AppError('No base currency configured', 400);

    // In production, this would call an external API
    // Example: const response = await fetch(`https://api.exchangeratesapi.io/latest?base=${baseCurrency.code}`);
    return {
      message: 'Exchange rate sync placeholder - would fetch from external API',
      baseCurrency: baseCurrency.code,
      lastSynced: new Date().toISOString(),
      ratesUpdated: 0,
    };
  }

  async getGainLoss(schema: string, options: any) {
    const asOfDate = options.asOfDate || new Date().toISOString().split('T')[0];

    // Find foreign-currency denominated receivables and payables
    const baseCurrency = await this.db.withSchema(schema).table('currencies').where({ is_base: true }).first();
    if (!baseCurrency) return { unrealizedGainLoss: 0, items: [] };

    // Outstanding invoices in foreign currencies
    const foreignInvoices = await this.db.withSchema(schema).table('invoices')
      .where('balance_due', '>', 0)
      .whereNot({ currency: baseCurrency.code })
      .whereIn('status', ['sent', 'overdue', 'partial']);

    const items = [];
    let totalGainLoss = 0;

    for (const inv of foreignInvoices) {
      const originalRate = parseFloat(inv.exchange_rate || 1);
      const currentRate = await this.db.withSchema(schema).table('exchange_rates')
        .where({ from_currency: inv.currency, to_currency: baseCurrency.code })
        .where('effective_date', '<=', asOfDate)
        .orderBy('effective_date', 'desc').first();

      const currentRateValue = parseFloat(currentRate?.rate || originalRate);
      const balanceDue = parseFloat(inv.balance_due);
      const originalValue = balanceDue * originalRate;
      const currentValue = balanceDue * currentRateValue;
      const gainLoss = currentValue - originalValue;

      items.push({
        type: 'invoice', id: inv.id, number: inv.invoice_number,
        currency: inv.currency, foreignAmount: balanceDue,
        originalRate, currentRate: currentRateValue,
        originalValue: originalValue.toFixed(2), currentValue: currentValue.toFixed(2),
        gainLoss: gainLoss.toFixed(2),
      });
      totalGainLoss += gainLoss;
    }

    return {
      asOfDate, baseCurrency: baseCurrency.code,
      unrealizedGainLoss: totalGainLoss.toFixed(2), items,
    };
  }

  async runRevaluation(ctx: ServiceContext, data: any) {
    const gainLoss = await this.getGainLoss(ctx.tenantSchema, { asOfDate: data.asOfDate });

    if (parseFloat(gainLoss.unrealizedGainLoss) === 0) {
      return { message: 'No gain/loss to record', gainLoss: 0 };
    }

    // Create journal entry for unrealized gain/loss
    const jeId = uuidv4();
    const amount = Math.abs(parseFloat(gainLoss.unrealizedGainLoss));
    const isGain = parseFloat(gainLoss.unrealizedGainLoss) > 0;

    await this.db.withSchema(ctx.tenantSchema).table('journal_entries').insert({
      id: jeId, entry_number: `REVAL-${Date.now()}`, date: data.asOfDate || new Date(),
      memo: `Currency revaluation as of ${data.asOfDate}`,
      source_type: 'revaluation', status: 'posted', total_amount: amount,
      posted_at: new Date(), created_by: ctx.userId, updated_by: ctx.userId,
    });

    // Record revaluation
    await this.db.withSchema(ctx.tenantSchema).table('currency_revaluations').insert({
      id: uuidv4(), revaluation_date: data.asOfDate || new Date(),
      journal_entry_id: jeId, total_gain_loss: parseFloat(gainLoss.unrealizedGainLoss),
      details: JSON.stringify(gainLoss.items), created_by: ctx.userId,
    });

    return {
      journalEntryId: jeId, gainLoss: gainLoss.unrealizedGainLoss,
      isGain, itemsRevalued: gainLoss.items.length,
    };
  }

  async revaluationHistory(schema: string) {
    return this.db.withSchema(schema).table('currency_revaluations')
      .orderBy('revaluation_date', 'desc').limit(50);
  }
}
