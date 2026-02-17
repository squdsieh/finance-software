import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/connection';
import { AppError } from '../../utils/app-error';
import { paginate } from '../../utils/pagination';
import { ServiceContext } from '../../types';

export class JournalEntriesService {
  private db = getDatabase();

  async list(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('journal_entries').where({ is_deleted: false });
    if (options.status) query = query.where({ status: options.status });
    if (options.sourceType) query = query.where({ source_type: options.sourceType });
    if (options.fromDate) query = query.where('date', '>=', options.fromDate);
    if (options.toDate) query = query.where('date', '<=', options.toDate);
    return paginate(query, {
      page: parseInt(options.page) || 1, limit: parseInt(options.limit) || 25,
      sortBy: options.sortBy || 'date', sortOrder: options.sortOrder || 'desc',
    });
  }

  async getById(schema: string, id: string) {
    const entry = await this.db.withSchema(schema).table('journal_entries').where({ id, is_deleted: false }).first();
    if (!entry) throw new AppError('Journal entry not found', 404);
    const lines = await this.db.withSchema(schema).table('journal_entry_lines')
      .where({ journal_entry_id: id }).orderBy('sort_order');
    return { ...entry, lines };
  }

  async create(ctx: ServiceContext, data: any) {
    const lines = data.lines || [];
    const totalDebits = lines.reduce((sum: number, l: any) => sum + (parseFloat(l.debitAmount) || 0), 0);
    const totalCredits = lines.reduce((sum: number, l: any) => sum + (parseFloat(l.creditAmount) || 0), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.005) {
      throw new AppError(`Debits (${totalDebits.toFixed(2)}) must equal credits (${totalCredits.toFixed(2)})`, 400);
    }
    if (lines.length < 2) {
      throw new AppError('Journal entry must have at least 2 lines', 400);
    }

    // Check period lock
    const lockedPeriod = await this.db.withSchema(ctx.tenantSchema).table('accounting_periods')
      .where({ is_locked: true }).where('end_date', '>=', data.date).where('start_date', '<=', data.date).first();
    if (lockedPeriod) {
      throw new AppError('Cannot create journal entry in a locked period', 400);
    }

    const id = uuidv4();
    const entryNumber = data.entryNumber || `JE-${Date.now()}`;
    await this.db.withSchema(ctx.tenantSchema).table('journal_entries').insert({
      id, entry_number: entryNumber, date: data.date,
      memo: data.memo, source_type: data.sourceType || 'manual',
      reference_number: data.referenceNumber, currency: data.currency || 'AED',
      exchange_rate: data.exchangeRate || 1, total_amount: totalDebits,
      status: data.autoPost ? 'posted' : 'draft',
      posted_at: data.autoPost ? new Date() : null,
      created_by: ctx.userId, updated_by: ctx.userId,
    });

    const lineInserts = lines.map((line: any, idx: number) => ({
      id: uuidv4(), journal_entry_id: id, account_id: line.accountId,
      description: line.description, debit_amount: parseFloat(line.debitAmount) || 0,
      credit_amount: parseFloat(line.creditAmount) || 0,
      customer_id: line.customerId, vendor_id: line.vendorId,
      department_id: line.departmentId, project_id: line.projectId,
      sort_order: idx,
    }));
    await this.db.withSchema(ctx.tenantSchema).table('journal_entry_lines').insert(lineInserts);

    return { id, entryNumber, totalAmount: totalDebits };
  }

  async update(ctx: ServiceContext, id: string, data: any) {
    const existing = await this.db.withSchema(ctx.tenantSchema).table('journal_entries').where({ id }).first();
    if (!existing) throw new AppError('Journal entry not found', 404);
    if (existing.status === 'posted') throw new AppError('Cannot edit a posted journal entry', 400);

    if (data.lines) {
      const lines = data.lines;
      const totalDebits = lines.reduce((sum: number, l: any) => sum + (parseFloat(l.debitAmount) || 0), 0);
      const totalCredits = lines.reduce((sum: number, l: any) => sum + (parseFloat(l.creditAmount) || 0), 0);
      if (Math.abs(totalDebits - totalCredits) > 0.005) {
        throw new AppError(`Debits (${totalDebits.toFixed(2)}) must equal credits (${totalCredits.toFixed(2)})`, 400);
      }

      await this.db.withSchema(ctx.tenantSchema).table('journal_entry_lines').where({ journal_entry_id: id }).del();
      const lineInserts = lines.map((line: any, idx: number) => ({
        id: uuidv4(), journal_entry_id: id, account_id: line.accountId,
        description: line.description, debit_amount: parseFloat(line.debitAmount) || 0,
        credit_amount: parseFloat(line.creditAmount) || 0,
        customer_id: line.customerId, vendor_id: line.vendorId,
        department_id: line.departmentId, project_id: line.projectId,
        sort_order: idx,
      }));
      await this.db.withSchema(ctx.tenantSchema).table('journal_entry_lines').insert(lineInserts);

      await this.db.withSchema(ctx.tenantSchema).table('journal_entries').where({ id }).update({
        total_amount: totalDebits, updated_at: new Date(), updated_by: ctx.userId,
      });
    }

    const updates: Record<string, any> = { updated_at: new Date(), updated_by: ctx.userId };
    if (data.date) updates.date = data.date;
    if (data.memo) updates.memo = data.memo;
    if (data.referenceNumber) updates.reference_number = data.referenceNumber;
    await this.db.withSchema(ctx.tenantSchema).table('journal_entries').where({ id }).update(updates);
    return { id };
  }

  async delete(ctx: ServiceContext, id: string) {
    const existing = await this.db.withSchema(ctx.tenantSchema).table('journal_entries').where({ id }).first();
    if (!existing) throw new AppError('Journal entry not found', 404);
    if (existing.status === 'posted') throw new AppError('Cannot delete a posted journal entry. Reverse it instead.', 400);
    await this.db.withSchema(ctx.tenantSchema).table('journal_entries').where({ id }).update({
      is_deleted: true, updated_at: new Date(), updated_by: ctx.userId,
    });
  }

  async postEntry(ctx: ServiceContext, id: string) {
    const existing = await this.db.withSchema(ctx.tenantSchema).table('journal_entries').where({ id }).first();
    if (!existing) throw new AppError('Journal entry not found', 404);
    if (existing.status === 'posted') throw new AppError('Journal entry is already posted', 400);
    await this.db.withSchema(ctx.tenantSchema).table('journal_entries').where({ id }).update({
      status: 'posted', posted_at: new Date(), updated_at: new Date(), updated_by: ctx.userId,
    });
  }

  async reverse(ctx: ServiceContext, id: string, data: any) {
    const original = await this.getById(ctx.tenantSchema, id);
    if (original.status !== 'posted') throw new AppError('Can only reverse posted entries', 400);

    const reversedLines = original.lines.map((line: any, idx: number) => ({
      accountId: line.account_id, description: `Reversal: ${line.description || ''}`,
      debitAmount: line.credit_amount, creditAmount: line.debit_amount,
      customerId: line.customer_id, vendorId: line.vendor_id,
      departmentId: line.department_id, projectId: line.project_id,
    }));

    const reversed = await this.create(ctx, {
      date: data.reversalDate || new Date().toISOString().split('T')[0],
      memo: `Reversal of ${original.entry_number}`,
      sourceType: 'reversal', lines: reversedLines, autoPost: true,
    });

    await this.db.withSchema(ctx.tenantSchema).table('journal_entries').where({ id }).update({
      is_reversed: true, reversed_by_id: reversed.id, updated_at: new Date(),
    });

    return reversed;
  }

  async duplicate(ctx: ServiceContext, id: string) {
    const original = await this.getById(ctx.tenantSchema, id);
    const lines = original.lines.map((line: any) => ({
      accountId: line.account_id, description: line.description,
      debitAmount: line.debit_amount, creditAmount: line.credit_amount,
      customerId: line.customer_id, vendorId: line.vendor_id,
    }));
    return this.create(ctx, {
      date: new Date().toISOString().split('T')[0],
      memo: `Copy of ${original.entry_number}: ${original.memo || ''}`,
      sourceType: 'manual', lines,
    });
  }

  async listRecurring(schema: string) {
    return this.db.withSchema(schema).table('recurring_journal_entries')
      .where({ is_active: true }).orderBy('name');
  }

  async createRecurring(ctx: ServiceContext, data: any) {
    const id = uuidv4();
    await this.db.withSchema(ctx.tenantSchema).table('recurring_journal_entries').insert({
      id, name: data.name, frequency: data.frequency,
      start_date: data.startDate, end_date: data.endDate,
      next_run_date: data.startDate, auto_post: data.autoPost || false,
      template_memo: data.memo, template_lines: JSON.stringify(data.lines),
      created_by: ctx.userId, updated_by: ctx.userId,
    });
    return { id };
  }

  async updateRecurring(ctx: ServiceContext, id: string, data: any) {
    const updates: Record<string, any> = { updated_at: new Date(), updated_by: ctx.userId };
    if (data.name) updates.name = data.name;
    if (data.frequency) updates.frequency = data.frequency;
    if (data.endDate) updates.end_date = data.endDate;
    if (data.autoPost !== undefined) updates.auto_post = data.autoPost;
    if (data.lines) updates.template_lines = JSON.stringify(data.lines);
    if (data.memo) updates.template_memo = data.memo;
    await this.db.withSchema(ctx.tenantSchema).table('recurring_journal_entries').where({ id }).update(updates);
    return { id };
  }

  async deleteRecurring(ctx: ServiceContext, id: string) {
    await this.db.withSchema(ctx.tenantSchema).table('recurring_journal_entries').where({ id }).update({
      is_active: false, updated_at: new Date(), updated_by: ctx.userId,
    });
  }

  async generateFromRecurring(ctx: ServiceContext, recurringId: string) {
    const recurring = await this.db.withSchema(ctx.tenantSchema).table('recurring_journal_entries')
      .where({ id: recurringId, is_active: true }).first();
    if (!recurring) throw new AppError('Recurring entry not found', 404);

    const lines = JSON.parse(recurring.template_lines);
    const entry = await this.create(ctx, {
      date: recurring.next_run_date, memo: recurring.template_memo,
      sourceType: 'recurring', lines, autoPost: recurring.auto_post,
    });

    // Calculate next run date
    const nextDate = new Date(recurring.next_run_date);
    switch (recurring.frequency) {
      case 'daily': nextDate.setDate(nextDate.getDate() + 1); break;
      case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
      case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
      case 'quarterly': nextDate.setMonth(nextDate.getMonth() + 3); break;
      case 'yearly': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
    }
    await this.db.withSchema(ctx.tenantSchema).table('recurring_journal_entries').where({ id: recurringId }).update({
      next_run_date: nextDate.toISOString().split('T')[0], last_run_date: new Date(),
    });

    return entry;
  }
}
