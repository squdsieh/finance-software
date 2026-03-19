import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/connection';
import { AppError } from '../../utils/app-error';
import { ServiceContext } from '../../types';

export class BudgetsService {
  private db = getDatabase();

  async list(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('budgets').where({ is_deleted: false });
    if (options.fiscalYear) query = query.where({ fiscal_year: options.fiscalYear });
    if (options.status) query = query.where({ status: options.status });
    return query.orderBy('fiscal_year', 'desc').orderBy('name');
  }

  async getById(schema: string, id: string) {
    const budget = await this.db.withSchema(schema).table('budgets').where({ id, is_deleted: false }).first();
    if (!budget) throw new AppError('Budget not found', 404);
    const lines = await this.db.withSchema(schema).table('budget_lines')
      .where({ budget_id: id })
      .leftJoin('chart_of_accounts', 'budget_lines.account_id', 'chart_of_accounts.id')
      .select('budget_lines.*', 'chart_of_accounts.account_name', 'chart_of_accounts.account_number')
      .orderBy('chart_of_accounts.account_number');
    return { ...budget, lines };
  }

  async create(ctx: ServiceContext, data: any) {
    const id = uuidv4();
    await this.db.withSchema(ctx.tenantSchema).table('budgets').insert({
      id, name: data.name, description: data.description,
      fiscal_year: data.fiscalYear, start_date: data.startDate, end_date: data.endDate,
      status: 'draft', budget_type: data.budgetType || 'annual',
      department_id: data.departmentId, total_amount: 0,
      created_by: ctx.userId, updated_by: ctx.userId,
    });

    // If accounts are provided, create budget lines with monthly breakdown
    if (data.accounts?.length) {
      for (const account of data.accounts) {
        const lineId = uuidv4();
        const annualAmount = parseFloat(account.annualAmount) || 0;
        const monthlyAmount = annualAmount / 12;

        await this.db.withSchema(ctx.tenantSchema).table('budget_lines').insert({
          id: lineId, budget_id: id, account_id: account.accountId,
          annual_amount: annualAmount,
          jan: account.jan ?? monthlyAmount, feb: account.feb ?? monthlyAmount,
          mar: account.mar ?? monthlyAmount, apr: account.apr ?? monthlyAmount,
          may: account.may ?? monthlyAmount, jun: account.jun ?? monthlyAmount,
          jul: account.jul ?? monthlyAmount, aug: account.aug ?? monthlyAmount,
          sep: account.sep ?? monthlyAmount, oct: account.oct ?? monthlyAmount,
          nov: account.nov ?? monthlyAmount, dec: account.dec ?? monthlyAmount,
        });
      }

      // Update total
      const total = data.accounts.reduce((sum: number, a: any) => sum + (parseFloat(a.annualAmount) || 0), 0);
      await this.db.withSchema(ctx.tenantSchema).table('budgets').where({ id }).update({ total_amount: total });
    }

    return { id };
  }

  async update(ctx: ServiceContext, id: string, data: any) {
    const budget = await this.db.withSchema(ctx.tenantSchema).table('budgets').where({ id }).first();
    if (!budget) throw new AppError('Budget not found', 404);
    if (budget.status === 'locked') throw new AppError('Cannot edit a locked budget', 400);

    const updates: Record<string, any> = { updated_at: new Date(), updated_by: ctx.userId };
    if (data.name) updates.name = data.name;
    if (data.description) updates.description = data.description;
    if (data.status) updates.status = data.status;
    await this.db.withSchema(ctx.tenantSchema).table('budgets').where({ id }).update(updates);
    return { id };
  }

  async delete(ctx: ServiceContext, id: string) {
    await this.db.withSchema(ctx.tenantSchema).table('budgets').where({ id }).update({
      is_deleted: true, updated_at: new Date(), updated_by: ctx.userId,
    });
  }

  async duplicate(ctx: ServiceContext, id: string, data: any) {
    const original = await this.getById(ctx.tenantSchema, id);
    const newId = uuidv4();
    await this.db.withSchema(ctx.tenantSchema).table('budgets').insert({
      id: newId, name: data.name || `${original.name} (Copy)`,
      description: original.description, fiscal_year: data.fiscalYear || original.fiscal_year,
      start_date: data.startDate || original.start_date, end_date: data.endDate || original.end_date,
      status: 'draft', budget_type: original.budget_type,
      department_id: original.department_id, total_amount: original.total_amount,
      created_by: ctx.userId, updated_by: ctx.userId,
    });

    for (const line of original.lines) {
      await this.db.withSchema(ctx.tenantSchema).table('budget_lines').insert({
        id: uuidv4(), budget_id: newId, account_id: line.account_id,
        annual_amount: line.annual_amount,
        jan: line.jan, feb: line.feb, mar: line.mar, apr: line.apr,
        may: line.may, jun: line.jun, jul: line.jul, aug: line.aug,
        sep: line.sep, oct: line.oct, nov: line.nov, dec: line.dec,
      });
    }
    return { id: newId };
  }

  async lock(ctx: ServiceContext, id: string) {
    await this.db.withSchema(ctx.tenantSchema).table('budgets').where({ id }).update({
      status: 'locked', locked_at: new Date(), locked_by: ctx.userId, updated_at: new Date(),
    });
  }

  async getLines(schema: string, budgetId: string) {
    return this.db.withSchema(schema).table('budget_lines')
      .where({ budget_id: budgetId })
      .leftJoin('chart_of_accounts', 'budget_lines.account_id', 'chart_of_accounts.id')
      .select('budget_lines.*', 'chart_of_accounts.account_name', 'chart_of_accounts.account_number')
      .orderBy('chart_of_accounts.account_number');
  }

  async updateLines(ctx: ServiceContext, budgetId: string, data: any) {
    const budget = await this.db.withSchema(ctx.tenantSchema).table('budgets').where({ id: budgetId }).first();
    if (!budget) throw new AppError('Budget not found', 404);
    if (budget.status === 'locked') throw new AppError('Cannot edit a locked budget', 400);

    for (const line of (data.lines || [])) {
      if (line.id) {
        // Update existing line
        const updates: Record<string, any> = { updated_at: new Date() };
        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        months.forEach(m => { if (line[m] !== undefined) updates[m] = parseFloat(line[m]); });
        if (Object.keys(updates).length > 1) {
          const monthValues = months.map(m => updates[m] ?? 0);
          updates.annual_amount = monthValues.reduce((sum: number, v: number) => sum + (v || 0), 0);
          await this.db.withSchema(ctx.tenantSchema).table('budget_lines').where({ id: line.id }).update(updates);
        }
      } else {
        // Create new line
        const annualAmount = parseFloat(line.annualAmount) || 0;
        const monthlyAmount = annualAmount / 12;
        await this.db.withSchema(ctx.tenantSchema).table('budget_lines').insert({
          id: uuidv4(), budget_id: budgetId, account_id: line.accountId,
          annual_amount: annualAmount,
          jan: line.jan ?? monthlyAmount, feb: line.feb ?? monthlyAmount,
          mar: line.mar ?? monthlyAmount, apr: line.apr ?? monthlyAmount,
          may: line.may ?? monthlyAmount, jun: line.jun ?? monthlyAmount,
          jul: line.jul ?? monthlyAmount, aug: line.aug ?? monthlyAmount,
          sep: line.sep ?? monthlyAmount, oct: line.oct ?? monthlyAmount,
          nov: line.nov ?? monthlyAmount, dec: line.dec ?? monthlyAmount,
        });
      }
    }

    // Recalculate total
    const totalResult = await this.db.withSchema(ctx.tenantSchema).table('budget_lines')
      .where({ budget_id: budgetId }).sum('annual_amount as total').first();
    await this.db.withSchema(ctx.tenantSchema).table('budgets').where({ id: budgetId }).update({
      total_amount: parseFloat(totalResult?.total || '0'), updated_at: new Date(), updated_by: ctx.userId,
    });
  }

  async budgetVsActual(schema: string, budgetId: string, options: any) {
    const budget = await this.getById(schema, budgetId);
    const month = parseInt(options.month) || new Date().getMonth() + 1;
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    const result = [];
    for (const line of budget.lines) {
      const budgetedMonthly = parseFloat(line[monthNames[month - 1]] || 0);
      const budgetedYTD = monthNames.slice(0, month).reduce((sum: number, m: string) => sum + parseFloat(line[m] || 0), 0);

      // Get actual amounts from journal entries
      const yearStart = `${budget.fiscal_year}-01-01`;
      const monthEnd = `${budget.fiscal_year}-${String(month).padStart(2, '0')}-${new Date(budget.fiscal_year, month, 0).getDate()}`;
      const monthStart = `${budget.fiscal_year}-${String(month).padStart(2, '0')}-01`;

      const actualYTDResult = await this.db.withSchema(schema).table('journal_entry_lines')
        .leftJoin('journal_entries', 'journal_entry_lines.journal_entry_id', 'journal_entries.id')
        .where({ 'journal_entries.status': 'posted', 'journal_entry_lines.account_id': line.account_id })
        .where('journal_entries.date', '>=', yearStart)
        .where('journal_entries.date', '<=', monthEnd)
        .select(this.db.raw('SUM(journal_entry_lines.debit_amount - journal_entry_lines.credit_amount) as actual'))
        .first();

      const actualMonthResult = await this.db.withSchema(schema).table('journal_entry_lines')
        .leftJoin('journal_entries', 'journal_entry_lines.journal_entry_id', 'journal_entries.id')
        .where({ 'journal_entries.status': 'posted', 'journal_entry_lines.account_id': line.account_id })
        .where('journal_entries.date', '>=', monthStart)
        .where('journal_entries.date', '<=', monthEnd)
        .select(this.db.raw('SUM(journal_entry_lines.debit_amount - journal_entry_lines.credit_amount) as actual'))
        .first();

      const actualMonthly = parseFloat(actualMonthResult?.actual || '0');
      const actualYTD = parseFloat(actualYTDResult?.actual || '0');

      result.push({
        accountId: line.account_id, accountName: line.account_name, accountNumber: line.account_number,
        budgetMonthly: budgetedMonthly.toFixed(2), actualMonthly: actualMonthly.toFixed(2),
        varianceMonthly: (budgetedMonthly - actualMonthly).toFixed(2),
        budgetYTD: budgetedYTD.toFixed(2), actualYTD: actualYTD.toFixed(2),
        varianceYTD: (budgetedYTD - actualYTD).toFixed(2),
        variancePercentYTD: budgetedYTD !== 0 ? (((budgetedYTD - actualYTD) / budgetedYTD) * 100).toFixed(1) : '0',
      });
    }

    return { budgetName: budget.name, fiscalYear: budget.fiscal_year, month, accounts: result };
  }

  async varianceReport(schema: string, budgetId: string, options: any) {
    return this.budgetVsActual(schema, budgetId, options);
  }
}
