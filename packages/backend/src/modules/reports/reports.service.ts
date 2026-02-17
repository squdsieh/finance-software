import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/connection';
import { AppError } from '../../utils/app-error';
import { ServiceContext } from '../../types';

export class ReportsService {
  private db = getDatabase();

  async profitAndLoss(schema: string, options: any) {
    const fromDate = options.fromDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const toDate = options.toDate || new Date().toISOString().split('T')[0];

    // Revenue accounts (type = 'revenue')
    const revenue = await this.db.withSchema(schema).table('journal_entry_lines')
      .leftJoin('journal_entries', 'journal_entry_lines.journal_entry_id', 'journal_entries.id')
      .leftJoin('chart_of_accounts', 'journal_entry_lines.account_id', 'chart_of_accounts.id')
      .where({ 'journal_entries.status': 'posted', 'chart_of_accounts.account_type': 'revenue' })
      .where('journal_entries.date', '>=', fromDate)
      .where('journal_entries.date', '<=', toDate)
      .select(
        'chart_of_accounts.id as account_id', 'chart_of_accounts.account_name',
        'chart_of_accounts.account_number',
        this.db.raw('SUM(journal_entry_lines.credit_amount - journal_entry_lines.debit_amount) as amount')
      )
      .groupBy('chart_of_accounts.id', 'chart_of_accounts.account_name', 'chart_of_accounts.account_number')
      .orderBy('chart_of_accounts.account_number');

    // COGS accounts (type = 'cost_of_goods_sold')
    const cogs = await this.db.withSchema(schema).table('journal_entry_lines')
      .leftJoin('journal_entries', 'journal_entry_lines.journal_entry_id', 'journal_entries.id')
      .leftJoin('chart_of_accounts', 'journal_entry_lines.account_id', 'chart_of_accounts.id')
      .where({ 'journal_entries.status': 'posted', 'chart_of_accounts.account_type': 'cost_of_goods_sold' })
      .where('journal_entries.date', '>=', fromDate)
      .where('journal_entries.date', '<=', toDate)
      .select(
        'chart_of_accounts.id as account_id', 'chart_of_accounts.account_name',
        'chart_of_accounts.account_number',
        this.db.raw('SUM(journal_entry_lines.debit_amount - journal_entry_lines.credit_amount) as amount')
      )
      .groupBy('chart_of_accounts.id', 'chart_of_accounts.account_name', 'chart_of_accounts.account_number')
      .orderBy('chart_of_accounts.account_number');

    // Expense accounts (type = 'expense')
    const expenses = await this.db.withSchema(schema).table('journal_entry_lines')
      .leftJoin('journal_entries', 'journal_entry_lines.journal_entry_id', 'journal_entries.id')
      .leftJoin('chart_of_accounts', 'journal_entry_lines.account_id', 'chart_of_accounts.id')
      .where({ 'journal_entries.status': 'posted', 'chart_of_accounts.account_type': 'expense' })
      .where('journal_entries.date', '>=', fromDate)
      .where('journal_entries.date', '<=', toDate)
      .select(
        'chart_of_accounts.id as account_id', 'chart_of_accounts.account_name',
        'chart_of_accounts.account_number',
        this.db.raw('SUM(journal_entry_lines.debit_amount - journal_entry_lines.credit_amount) as amount')
      )
      .groupBy('chart_of_accounts.id', 'chart_of_accounts.account_name', 'chart_of_accounts.account_number')
      .orderBy('chart_of_accounts.account_number');

    // Other income
    const otherIncome = await this.db.withSchema(schema).table('journal_entry_lines')
      .leftJoin('journal_entries', 'journal_entry_lines.journal_entry_id', 'journal_entries.id')
      .leftJoin('chart_of_accounts', 'journal_entry_lines.account_id', 'chart_of_accounts.id')
      .where({ 'journal_entries.status': 'posted', 'chart_of_accounts.account_type': 'other_income' })
      .where('journal_entries.date', '>=', fromDate)
      .where('journal_entries.date', '<=', toDate)
      .select(
        'chart_of_accounts.id as account_id', 'chart_of_accounts.account_name',
        'chart_of_accounts.account_number',
        this.db.raw('SUM(journal_entry_lines.credit_amount - journal_entry_lines.debit_amount) as amount')
      )
      .groupBy('chart_of_accounts.id', 'chart_of_accounts.account_name', 'chart_of_accounts.account_number')
      .orderBy('chart_of_accounts.account_number');

    const totalRevenue = revenue.reduce((s: number, r: any) => s + parseFloat(r.amount || 0), 0);
    const totalCOGS = cogs.reduce((s: number, r: any) => s + parseFloat(r.amount || 0), 0);
    const grossProfit = totalRevenue - totalCOGS;
    const totalExpenses = expenses.reduce((s: number, r: any) => s + parseFloat(r.amount || 0), 0);
    const totalOtherIncome = otherIncome.reduce((s: number, r: any) => s + parseFloat(r.amount || 0), 0);
    const netIncome = grossProfit - totalExpenses + totalOtherIncome;

    return {
      period: { from: fromDate, to: toDate },
      revenue, totalRevenue: totalRevenue.toFixed(2),
      costOfGoodsSold: cogs, totalCOGS: totalCOGS.toFixed(2),
      grossProfit: grossProfit.toFixed(2),
      expenses, totalExpenses: totalExpenses.toFixed(2),
      otherIncome, totalOtherIncome: totalOtherIncome.toFixed(2),
      netIncome: netIncome.toFixed(2),
    };
  }

  async balanceSheet(schema: string, options: any) {
    const asOfDate = options.asOfDate || new Date().toISOString().split('T')[0];

    const getBalances = async (accountType: string, isDebitNormal: boolean) => {
      const accounts = await this.db.withSchema(schema).table('journal_entry_lines')
        .leftJoin('journal_entries', 'journal_entry_lines.journal_entry_id', 'journal_entries.id')
        .leftJoin('chart_of_accounts', 'journal_entry_lines.account_id', 'chart_of_accounts.id')
        .where({ 'journal_entries.status': 'posted', 'chart_of_accounts.account_type': accountType })
        .where('journal_entries.date', '<=', asOfDate)
        .select(
          'chart_of_accounts.id as account_id', 'chart_of_accounts.account_name',
          'chart_of_accounts.account_number', 'chart_of_accounts.account_sub_type',
          this.db.raw(isDebitNormal
            ? 'SUM(journal_entry_lines.debit_amount - journal_entry_lines.credit_amount) as balance'
            : 'SUM(journal_entry_lines.credit_amount - journal_entry_lines.debit_amount) as balance'
          )
        )
        .groupBy('chart_of_accounts.id', 'chart_of_accounts.account_name',
          'chart_of_accounts.account_number', 'chart_of_accounts.account_sub_type')
        .orderBy('chart_of_accounts.account_number');
      return accounts;
    };

    const assets = await getBalances('asset', true);
    const liabilities = await getBalances('liability', false);
    const equity = await getBalances('equity', false);

    const totalAssets = assets.reduce((s: number, a: any) => s + parseFloat(a.balance || 0), 0);
    const totalLiabilities = liabilities.reduce((s: number, l: any) => s + parseFloat(l.balance || 0), 0);
    const totalEquity = equity.reduce((s: number, e: any) => s + parseFloat(e.balance || 0), 0);

    // Calculate retained earnings (net income for all time up to date)
    const retainedEarnings = totalAssets - totalLiabilities - totalEquity;

    return {
      asOfDate,
      assets, totalAssets: totalAssets.toFixed(2),
      liabilities, totalLiabilities: totalLiabilities.toFixed(2),
      equity, totalEquity: totalEquity.toFixed(2),
      retainedEarnings: retainedEarnings.toFixed(2),
      totalLiabilitiesAndEquity: (totalLiabilities + totalEquity + retainedEarnings).toFixed(2),
    };
  }

  async cashFlow(schema: string, options: any) {
    const fromDate = options.fromDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const toDate = options.toDate || new Date().toISOString().split('T')[0];

    // Simplified cash flow using direct method
    const cashAccounts = await this.db.withSchema(schema).table('chart_of_accounts')
      .where({ account_sub_type: 'cash' }).orWhere({ account_sub_type: 'bank' })
      .select('id');
    const cashAccountIds = cashAccounts.map((a: any) => a.id);

    if (cashAccountIds.length === 0) {
      return { period: { from: fromDate, to: toDate }, operating: [], investing: [], financing: [],
        netCashChange: '0.00', beginningCash: '0.00', endingCash: '0.00' };
    }

    // Cash receipts from customers
    const cashReceipts = await this.db.withSchema(schema).table('journal_entry_lines')
      .leftJoin('journal_entries', 'journal_entry_lines.journal_entry_id', 'journal_entries.id')
      .where({ 'journal_entries.status': 'posted' })
      .whereIn('journal_entry_lines.account_id', cashAccountIds)
      .where('journal_entries.date', '>=', fromDate)
      .where('journal_entries.date', '<=', toDate)
      .select(
        this.db.raw('SUM(journal_entry_lines.debit_amount) as total_inflows'),
        this.db.raw('SUM(journal_entry_lines.credit_amount) as total_outflows')
      ).first();

    const inflows = parseFloat(cashReceipts?.total_inflows || '0');
    const outflows = parseFloat(cashReceipts?.total_outflows || '0');
    const netCashChange = inflows - outflows;

    // Beginning cash balance
    const beginningBalance = await this.db.withSchema(schema).table('journal_entry_lines')
      .leftJoin('journal_entries', 'journal_entry_lines.journal_entry_id', 'journal_entries.id')
      .where({ 'journal_entries.status': 'posted' })
      .whereIn('journal_entry_lines.account_id', cashAccountIds)
      .where('journal_entries.date', '<', fromDate)
      .select(
        this.db.raw('SUM(journal_entry_lines.debit_amount - journal_entry_lines.credit_amount) as balance')
      ).first();

    const beginningCash = parseFloat(beginningBalance?.balance || '0');
    const endingCash = beginningCash + netCashChange;

    return {
      period: { from: fromDate, to: toDate },
      operating: [
        { label: 'Cash received', amount: inflows.toFixed(2) },
        { label: 'Cash paid', amount: (-outflows).toFixed(2) },
      ],
      investing: [],
      financing: [],
      netCashChange: netCashChange.toFixed(2),
      beginningCash: beginningCash.toFixed(2),
      endingCash: endingCash.toFixed(2),
    };
  }

  async trialBalance(schema: string, options: any) {
    const asOfDate = options.asOfDate || new Date().toISOString().split('T')[0];

    const accounts = await this.db.withSchema(schema).table('journal_entry_lines')
      .leftJoin('journal_entries', 'journal_entry_lines.journal_entry_id', 'journal_entries.id')
      .leftJoin('chart_of_accounts', 'journal_entry_lines.account_id', 'chart_of_accounts.id')
      .where({ 'journal_entries.status': 'posted' })
      .where('journal_entries.date', '<=', asOfDate)
      .select(
        'chart_of_accounts.id as account_id', 'chart_of_accounts.account_number',
        'chart_of_accounts.account_name', 'chart_of_accounts.account_type',
        this.db.raw('SUM(journal_entry_lines.debit_amount) as total_debits'),
        this.db.raw('SUM(journal_entry_lines.credit_amount) as total_credits')
      )
      .groupBy('chart_of_accounts.id', 'chart_of_accounts.account_number',
        'chart_of_accounts.account_name', 'chart_of_accounts.account_type')
      .orderBy('chart_of_accounts.account_number');

    const totalDebits = accounts.reduce((s: number, a: any) => s + parseFloat(a.total_debits || 0), 0);
    const totalCredits = accounts.reduce((s: number, a: any) => s + parseFloat(a.total_credits || 0), 0);

    return {
      asOfDate,
      accounts: accounts.map((a: any) => ({
        ...a,
        debitBalance: parseFloat(a.total_debits) > parseFloat(a.total_credits)
          ? (parseFloat(a.total_debits) - parseFloat(a.total_credits)).toFixed(2) : '0.00',
        creditBalance: parseFloat(a.total_credits) > parseFloat(a.total_debits)
          ? (parseFloat(a.total_credits) - parseFloat(a.total_debits)).toFixed(2) : '0.00',
      })),
      totalDebits: totalDebits.toFixed(2),
      totalCredits: totalCredits.toFixed(2),
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
    };
  }

  async arAging(schema: string, options: any) {
    const asOfDate = options.asOfDate || new Date().toISOString().split('T')[0];
    const invoices = await this.db.withSchema(schema).table('invoices')
      .leftJoin('customers', 'invoices.customer_id', 'customers.id')
      .whereIn('invoices.status', ['sent', 'overdue', 'partial'])
      .where('invoices.balance_due', '>', 0)
      .select('invoices.*', 'customers.display_name as customer_name');

    const aging: Record<string, any> = {};
    for (const inv of invoices) {
      const dueDate = new Date(inv.due_date);
      const asOf = new Date(asOfDate);
      const daysPastDue = Math.max(0, Math.floor((asOf.getTime() - dueDate.getTime()) / 86400000));
      const bucket = daysPastDue === 0 ? 'current' : daysPastDue <= 30 ? '1-30'
        : daysPastDue <= 60 ? '31-60' : daysPastDue <= 90 ? '61-90' : '90+';

      const customerId = inv.customer_id;
      if (!aging[customerId]) {
        aging[customerId] = {
          customerId, customerName: inv.customer_name,
          current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0, total: 0,
        };
      }
      const amount = parseFloat(inv.balance_due);
      aging[customerId][bucket] += amount;
      aging[customerId].total += amount;
    }

    const rows = Object.values(aging);
    const totals = rows.reduce((acc: any, row: any) => ({
      current: acc.current + row.current, '1-30': acc['1-30'] + row['1-30'],
      '31-60': acc['31-60'] + row['31-60'], '61-90': acc['61-90'] + row['61-90'],
      '90+': acc['90+'] + row['90+'], total: acc.total + row.total,
    }), { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0, total: 0 });

    return { asOfDate, rows, totals };
  }

  async apAging(schema: string, options: any) {
    const asOfDate = options.asOfDate || new Date().toISOString().split('T')[0];
    const bills = await this.db.withSchema(schema).table('bills')
      .leftJoin('vendors', 'bills.vendor_id', 'vendors.id')
      .whereIn('bills.status', ['received', 'overdue', 'partial'])
      .where('bills.balance_due', '>', 0)
      .select('bills.*', 'vendors.display_name as vendor_name');

    const aging: Record<string, any> = {};
    for (const bill of bills) {
      const dueDate = new Date(bill.due_date);
      const asOf = new Date(asOfDate);
      const daysPastDue = Math.max(0, Math.floor((asOf.getTime() - dueDate.getTime()) / 86400000));
      const bucket = daysPastDue === 0 ? 'current' : daysPastDue <= 30 ? '1-30'
        : daysPastDue <= 60 ? '31-60' : daysPastDue <= 90 ? '61-90' : '90+';

      const vendorId = bill.vendor_id;
      if (!aging[vendorId]) {
        aging[vendorId] = {
          vendorId, vendorName: bill.vendor_name,
          current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0, total: 0,
        };
      }
      const amount = parseFloat(bill.balance_due);
      aging[vendorId][bucket] += amount;
      aging[vendorId].total += amount;
    }

    const rows = Object.values(aging);
    const totals = rows.reduce((acc: any, row: any) => ({
      current: acc.current + row.current, '1-30': acc['1-30'] + row['1-30'],
      '31-60': acc['31-60'] + row['31-60'], '61-90': acc['61-90'] + row['61-90'],
      '90+': acc['90+'] + row['90+'], total: acc.total + row.total,
    }), { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0, total: 0 });

    return { asOfDate, rows, totals };
  }

  async arSummary(schema: string, options: any) {
    const fromDate = options.fromDate;
    const toDate = options.toDate;
    let query = this.db.withSchema(schema).table('invoices')
      .leftJoin('customers', 'invoices.customer_id', 'customers.id')
      .whereNot({ 'invoices.status': 'voided' });
    if (fromDate) query = query.where('invoices.date', '>=', fromDate);
    if (toDate) query = query.where('invoices.date', '<=', toDate);
    return query.select(
      'customers.id as customer_id', 'customers.display_name as customer_name',
      this.db.raw('COUNT(invoices.id) as invoice_count'),
      this.db.raw('SUM(invoices.total) as total_invoiced'),
      this.db.raw('SUM(invoices.amount_paid) as total_paid'),
      this.db.raw('SUM(invoices.balance_due) as total_outstanding')
    ).groupBy('customers.id', 'customers.display_name').orderBy('total_outstanding', 'desc');
  }

  async apSummary(schema: string, options: any) {
    const fromDate = options.fromDate;
    const toDate = options.toDate;
    let query = this.db.withSchema(schema).table('bills')
      .leftJoin('vendors', 'bills.vendor_id', 'vendors.id')
      .whereNot({ 'bills.status': 'voided' });
    if (fromDate) query = query.where('bills.date', '>=', fromDate);
    if (toDate) query = query.where('bills.date', '<=', toDate);
    return query.select(
      'vendors.id as vendor_id', 'vendors.display_name as vendor_name',
      this.db.raw('COUNT(bills.id) as bill_count'),
      this.db.raw('SUM(bills.total) as total_billed'),
      this.db.raw('SUM(bills.amount_paid) as total_paid'),
      this.db.raw('SUM(bills.balance_due) as total_outstanding')
    ).groupBy('vendors.id', 'vendors.display_name').orderBy('total_outstanding', 'desc');
  }

  async generalLedger(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('journal_entry_lines')
      .leftJoin('journal_entries', 'journal_entry_lines.journal_entry_id', 'journal_entries.id')
      .leftJoin('chart_of_accounts', 'journal_entry_lines.account_id', 'chart_of_accounts.id')
      .where({ 'journal_entries.status': 'posted' });
    if (options.accountId) query = query.where({ 'journal_entry_lines.account_id': options.accountId });
    if (options.fromDate) query = query.where('journal_entries.date', '>=', options.fromDate);
    if (options.toDate) query = query.where('journal_entries.date', '<=', options.toDate);
    return query.select(
      'journal_entries.date', 'journal_entries.entry_number', 'journal_entries.memo',
      'chart_of_accounts.account_number', 'chart_of_accounts.account_name',
      'journal_entry_lines.description', 'journal_entry_lines.debit_amount',
      'journal_entry_lines.credit_amount'
    ).orderBy('journal_entries.date').orderBy('journal_entries.entry_number');
  }

  async journalReport(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('journal_entries')
      .where({ status: 'posted', is_deleted: false });
    if (options.fromDate) query = query.where('date', '>=', options.fromDate);
    if (options.toDate) query = query.where('date', '<=', options.toDate);
    if (options.sourceType) query = query.where({ source_type: options.sourceType });
    const entries = await query.orderBy('date').orderBy('entry_number');
    for (const entry of entries) {
      entry.lines = await this.db.withSchema(schema).table('journal_entry_lines')
        .where({ journal_entry_id: entry.id })
        .leftJoin('chart_of_accounts', 'journal_entry_lines.account_id', 'chart_of_accounts.id')
        .select('journal_entry_lines.*', 'chart_of_accounts.account_name', 'chart_of_accounts.account_number')
        .orderBy('sort_order');
    }
    return entries;
  }

  async incomeByCustomer(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('invoices')
      .leftJoin('customers', 'invoices.customer_id', 'customers.id')
      .whereNot({ 'invoices.status': 'voided' });
    if (options.fromDate) query = query.where('invoices.date', '>=', options.fromDate);
    if (options.toDate) query = query.where('invoices.date', '<=', options.toDate);
    return query.select(
      'customers.id as customer_id', 'customers.display_name as customer_name',
      this.db.raw('SUM(invoices.subtotal) as total_income'),
      this.db.raw('SUM(invoices.tax_amount) as total_tax'),
      this.db.raw('COUNT(invoices.id) as invoice_count')
    ).groupBy('customers.id', 'customers.display_name').orderBy('total_income', 'desc');
  }

  async expensesByVendor(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('bills')
      .leftJoin('vendors', 'bills.vendor_id', 'vendors.id')
      .whereNot({ 'bills.status': 'voided' });
    if (options.fromDate) query = query.where('bills.date', '>=', options.fromDate);
    if (options.toDate) query = query.where('bills.date', '<=', options.toDate);
    return query.select(
      'vendors.id as vendor_id', 'vendors.display_name as vendor_name',
      this.db.raw('SUM(bills.subtotal) as total_expenses'),
      this.db.raw('SUM(bills.tax_amount) as total_tax'),
      this.db.raw('COUNT(bills.id) as bill_count')
    ).groupBy('vendors.id', 'vendors.display_name').orderBy('total_expenses', 'desc');
  }

  async taxSummary(schema: string, options: any) {
    const fromDate = options.fromDate;
    const toDate = options.toDate;
    let salesQuery = this.db.withSchema(schema).table('invoices').whereNot({ status: 'voided' });
    let purchaseQuery = this.db.withSchema(schema).table('bills').whereNot({ status: 'voided' });
    if (fromDate) { salesQuery = salesQuery.where('date', '>=', fromDate); purchaseQuery = purchaseQuery.where('date', '>=', fromDate); }
    if (toDate) { salesQuery = salesQuery.where('date', '<=', toDate); purchaseQuery = purchaseQuery.where('date', '<=', toDate); }
    const sales = await salesQuery.sum('tax_amount as total').first();
    const purchases = await purchaseQuery.sum('tax_amount as total').first();
    const collected = parseFloat(sales?.total || '0');
    const paid = parseFloat(purchases?.total || '0');
    return { taxCollected: collected.toFixed(2), taxPaid: paid.toFixed(2), netTax: (collected - paid).toFixed(2) };
  }

  async salesByProduct(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('invoice_lines')
      .leftJoin('invoices', 'invoice_lines.invoice_id', 'invoices.id')
      .whereNot({ 'invoices.status': 'voided' });
    if (options.fromDate) query = query.where('invoices.date', '>=', options.fromDate);
    if (options.toDate) query = query.where('invoices.date', '<=', options.toDate);
    return query.select(
      'invoice_lines.item_id', 'invoice_lines.description',
      this.db.raw('SUM(invoice_lines.quantity) as total_quantity'),
      this.db.raw('SUM(invoice_lines.amount) as total_amount')
    ).groupBy('invoice_lines.item_id', 'invoice_lines.description').orderBy('total_amount', 'desc');
  }

  async listCustomReports(schema: string) {
    return this.db.withSchema(schema).table('custom_reports').where({ is_deleted: false }).orderBy('name');
  }

  async createCustomReport(ctx: ServiceContext, data: any) {
    const id = uuidv4();
    await this.db.withSchema(ctx.tenantSchema).table('custom_reports').insert({
      id, name: data.name, description: data.description,
      report_type: data.reportType, columns: JSON.stringify(data.columns || []),
      filters: JSON.stringify(data.filters || []), grouping: JSON.stringify(data.grouping || []),
      sorting: JSON.stringify(data.sorting || []), created_by: ctx.userId, updated_by: ctx.userId,
    });
    return { id };
  }

  async runCustomReport(schema: string, id: string, options: any) {
    const report = await this.db.withSchema(schema).table('custom_reports').where({ id }).first();
    if (!report) throw new AppError('Custom report not found', 404);
    // Execute the custom report definition - simplified implementation
    return { reportName: report.name, definition: report, data: [], message: 'Custom report execution placeholder' };
  }

  async updateCustomReport(ctx: ServiceContext, id: string, data: any) {
    const updates: Record<string, any> = { updated_at: new Date(), updated_by: ctx.userId };
    if (data.name) updates.name = data.name;
    if (data.description) updates.description = data.description;
    if (data.columns) updates.columns = JSON.stringify(data.columns);
    if (data.filters) updates.filters = JSON.stringify(data.filters);
    if (data.grouping) updates.grouping = JSON.stringify(data.grouping);
    await this.db.withSchema(ctx.tenantSchema).table('custom_reports').where({ id }).update(updates);
    return { id };
  }

  async deleteCustomReport(ctx: ServiceContext, id: string) {
    await this.db.withSchema(ctx.tenantSchema).table('custom_reports').where({ id }).update({
      is_deleted: true, updated_at: new Date(),
    });
  }

  async exportReport(_schema: string, data: any) {
    return { format: data.format || 'pdf', message: 'Report export placeholder', downloadUrl: null };
  }
}
