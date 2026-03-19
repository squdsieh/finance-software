import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/connection';
import { AppError } from '../../utils/app-error';
import { paginate } from '../../utils/pagination';
import { ServiceContext } from '../../types';

export class AuditService {
  private db = getDatabase();

  async listLogs(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('audit_logs');
    if (options.entityType) query = query.where({ entity_type: options.entityType });
    if (options.entityId) query = query.where({ entity_id: options.entityId });
    if (options.action) query = query.where({ action: options.action });
    if (options.userId) query = query.where({ user_id: options.userId });
    if (options.fromDate) query = query.where('created_at', '>=', options.fromDate);
    if (options.toDate) query = query.where('created_at', '<=', options.toDate);
    return paginate(query, {
      page: parseInt(options.page) || 1, limit: parseInt(options.limit) || 50,
      sortBy: 'created_at', sortOrder: 'desc',
    });
  }

  async getLog(schema: string, id: string) {
    const log = await this.db.withSchema(schema).table('audit_logs').where({ id }).first();
    if (!log) throw new AppError('Audit log not found', 404);
    return log;
  }

  async getEntityHistory(schema: string, entityType: string, entityId: string) {
    return this.db.withSchema(schema).table('audit_logs')
      .where({ entity_type: entityType, entity_id: entityId })
      .orderBy('created_at', 'desc');
  }

  // Static method to record audit entries (called by other services)
  static async log(schema: string, entry: {
    userId: string; action: string; entityType: string; entityId: string;
    oldValues?: any; newValues?: any; ipAddress?: string; userAgent?: string;
  }) {
    const db = getDatabase();
    await db.withSchema(schema).table('audit_logs').insert({
      id: uuidv4(), user_id: entry.userId, action: entry.action,
      entity_type: entry.entityType, entity_id: entry.entityId,
      old_values: entry.oldValues ? JSON.stringify(entry.oldValues) : null,
      new_values: entry.newValues ? JSON.stringify(entry.newValues) : null,
      ip_address: entry.ipAddress, user_agent: entry.userAgent,
      created_at: new Date(),
    });
  }

  async listPeriods(schema: string) {
    return this.db.withSchema(schema).table('accounting_periods').orderBy('start_date', 'desc');
  }

  async createPeriod(ctx: ServiceContext, data: any) {
    const id = uuidv4();
    // Check for overlapping periods
    const overlap = await this.db.withSchema(ctx.tenantSchema).table('accounting_periods')
      .where('start_date', '<=', data.endDate)
      .where('end_date', '>=', data.startDate)
      .first();
    if (overlap) throw new AppError('Period overlaps with existing period', 400);

    await this.db.withSchema(ctx.tenantSchema).table('accounting_periods').insert({
      id, name: data.name, start_date: data.startDate, end_date: data.endDate,
      fiscal_year: data.fiscalYear, is_locked: false,
      created_by: ctx.userId,
    });
    return { id };
  }

  async lockPeriod(ctx: ServiceContext, id: string) {
    const period = await this.db.withSchema(ctx.tenantSchema).table('accounting_periods').where({ id }).first();
    if (!period) throw new AppError('Period not found', 404);
    if (period.is_locked) throw new AppError('Period is already locked', 400);

    await this.db.withSchema(ctx.tenantSchema).table('accounting_periods').where({ id }).update({
      is_locked: true, locked_at: new Date(), locked_by: ctx.userId, updated_at: new Date(),
    });

    await AuditService.log(ctx.tenantSchema, {
      userId: ctx.userId, action: 'period_locked',
      entityType: 'accounting_period', entityId: id,
      newValues: { lockedAt: new Date(), periodName: period.name },
    });
  }

  async unlockPeriod(ctx: ServiceContext, id: string) {
    const period = await this.db.withSchema(ctx.tenantSchema).table('accounting_periods').where({ id }).first();
    if (!period) throw new AppError('Period not found', 404);
    if (!period.is_locked) throw new AppError('Period is not locked', 400);

    await this.db.withSchema(ctx.tenantSchema).table('accounting_periods').where({ id }).update({
      is_locked: false, locked_at: null, locked_by: null, updated_at: new Date(),
    });

    await AuditService.log(ctx.tenantSchema, {
      userId: ctx.userId, action: 'period_unlocked',
      entityType: 'accounting_period', entityId: id,
      newValues: { unlockedAt: new Date(), periodName: period.name },
    });
  }

  async yearEndClose(ctx: ServiceContext, data: any) {
    const fiscalYear = data.fiscalYear;
    const closeDate = `${fiscalYear}-12-31`;

    // 1. Lock all periods for the fiscal year
    await this.db.withSchema(ctx.tenantSchema).table('accounting_periods')
      .where({ fiscal_year: fiscalYear }).update({
        is_locked: true, locked_at: new Date(), locked_by: ctx.userId,
      });

    // 2. Calculate net income for the year
    const revenueResult = await this.db.withSchema(ctx.tenantSchema).table('journal_entry_lines')
      .leftJoin('journal_entries', 'journal_entry_lines.journal_entry_id', 'journal_entries.id')
      .leftJoin('chart_of_accounts', 'journal_entry_lines.account_id', 'chart_of_accounts.id')
      .where({ 'journal_entries.status': 'posted' })
      .whereIn('chart_of_accounts.account_type', ['revenue', 'other_income'])
      .where('journal_entries.date', '>=', `${fiscalYear}-01-01`)
      .where('journal_entries.date', '<=', closeDate)
      .select(this.db.raw('SUM(credit_amount - debit_amount) as total')).first();

    const expenseResult = await this.db.withSchema(ctx.tenantSchema).table('journal_entry_lines')
      .leftJoin('journal_entries', 'journal_entry_lines.journal_entry_id', 'journal_entries.id')
      .leftJoin('chart_of_accounts', 'journal_entry_lines.account_id', 'chart_of_accounts.id')
      .where({ 'journal_entries.status': 'posted' })
      .whereIn('chart_of_accounts.account_type', ['expense', 'cost_of_goods_sold'])
      .where('journal_entries.date', '>=', `${fiscalYear}-01-01`)
      .where('journal_entries.date', '<=', closeDate)
      .select(this.db.raw('SUM(debit_amount - credit_amount) as total')).first();

    const totalRevenue = parseFloat(revenueResult?.total || '0');
    const totalExpenses = parseFloat(expenseResult?.total || '0');
    const netIncome = totalRevenue - totalExpenses;

    // 3. Create closing journal entry to move net income to retained earnings
    const retainedEarningsAccount = await this.db.withSchema(ctx.tenantSchema).table('chart_of_accounts')
      .where({ account_sub_type: 'retained_earnings' }).first();

    if (retainedEarningsAccount) {
      const jeId = uuidv4();
      await this.db.withSchema(ctx.tenantSchema).table('journal_entries').insert({
        id: jeId, entry_number: `YEC-${fiscalYear}`, date: closeDate,
        memo: `Year-end close ${fiscalYear}: Transfer net income to retained earnings`,
        source_type: 'year_end_close', status: 'posted', total_amount: Math.abs(netIncome),
        posted_at: new Date(), created_by: ctx.userId, updated_by: ctx.userId,
      });

      // Close revenue/expense accounts to income summary, then to retained earnings
      // Simplified: directly to retained earnings
      if (netIncome >= 0) {
        await this.db.withSchema(ctx.tenantSchema).table('journal_entry_lines').insert([
          { id: uuidv4(), journal_entry_id: jeId, account_id: 'income_summary_placeholder',
            debit_amount: netIncome, credit_amount: 0, description: 'Close income summary', sort_order: 0 },
          { id: uuidv4(), journal_entry_id: jeId, account_id: retainedEarningsAccount.id,
            debit_amount: 0, credit_amount: netIncome, description: 'Transfer to retained earnings', sort_order: 1 },
        ]);
      }
    }

    await AuditService.log(ctx.tenantSchema, {
      userId: ctx.userId, action: 'year_end_close',
      entityType: 'fiscal_year', entityId: String(fiscalYear),
      newValues: { netIncome, closedAt: new Date() },
    });

    return { fiscalYear, netIncome: netIncome.toFixed(2), periodsLocked: true };
  }

  async yearEndStatus(schema: string, options: any) {
    const fiscalYear = options.fiscalYear || new Date().getFullYear();
    const periods = await this.db.withSchema(schema).table('accounting_periods')
      .where({ fiscal_year: fiscalYear });
    const allLocked = periods.length > 0 && periods.every((p: any) => p.is_locked);
    const closingEntry = await this.db.withSchema(schema).table('journal_entries')
      .where({ source_type: 'year_end_close', entry_number: `YEC-${fiscalYear}` }).first();

    return {
      fiscalYear, periods: periods.length, lockedPeriods: periods.filter((p: any) => p.is_locked).length,
      allLocked, yearEndClosed: !!closingEntry, closedAt: closingEntry?.posted_at || null,
    };
  }

  async exportAuditTrail(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('audit_logs')
      .leftJoin('users', 'audit_logs.user_id', 'users.id');
    if (options.fromDate) query = query.where('audit_logs.created_at', '>=', options.fromDate);
    if (options.toDate) query = query.where('audit_logs.created_at', '<=', options.toDate);
    const logs = await query.select(
      'audit_logs.*', 'users.first_name', 'users.last_name', 'users.email'
    ).orderBy('audit_logs.created_at').limit(10000);

    return {
      format: 'json', exportedAt: new Date().toISOString(),
      recordCount: logs.length, data: logs,
    };
  }

  async exportFTAReport(schema: string, options: any) {
    // UAE FTA Audit File (FAF) format
    const fromDate = options.fromDate;
    const toDate = options.toDate;

    const companyInfo = await this.db.withSchema(schema).table('company_settings').first();
    const accounts = await this.db.withSchema(schema).table('chart_of_accounts')
      .where({ is_active: true }).orderBy('account_number');
    const journalEntries = await this.db.withSchema(schema).table('journal_entries')
      .where({ status: 'posted' })
      .where('date', '>=', fromDate).where('date', '<=', toDate)
      .orderBy('date');

    return {
      header: {
        auditFileVersion: 'UAE-FAF-1.0', companyName: companyInfo?.company_name,
        taxRegistrationNumber: companyInfo?.tax_registration_number,
        periodFrom: fromDate, periodTo: toDate,
        generatedAt: new Date().toISOString(),
      },
      masterFiles: {
        chartOfAccounts: accounts.map((a: any) => ({
          accountNumber: a.account_number, accountName: a.account_name,
          accountType: a.account_type,
        })),
      },
      generalLedgerEntries: {
        totalDebit: 0, totalCredit: 0,
        journals: journalEntries,
      },
    };
  }

  async exportChartOfAccounts(schema: string) {
    const accounts = await this.db.withSchema(schema).table('chart_of_accounts')
      .where({ is_active: true }).orderBy('account_number');
    return {
      exportedAt: new Date().toISOString(),
      accountCount: accounts.length,
      accounts: accounts.map((a: any) => ({
        number: a.account_number, name: a.account_name,
        type: a.account_type, subType: a.account_sub_type,
        parentId: a.parent_id, isActive: a.is_active,
      })),
    };
  }
}
