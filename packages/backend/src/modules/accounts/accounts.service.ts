import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/connection';
import { AppError } from '../../utils/app-error';
import { createAuditLog } from '../../utils/audit';
import { ServiceContext } from '../../types';

export class AccountsService {
  private db = getDatabase();

  async list(schema: string, filters: { type?: string; isActive?: boolean; search?: string }) {
    let query = this.db.withSchema(schema).table('accounts').where({ is_deleted: false });

    if (filters.type) query = query.where({ type: filters.type });
    if (filters.isActive !== undefined) query = query.where({ is_active: filters.isActive });
    if (filters.search) query = query.where('name', 'ilike', `%${filters.search}%`);

    return query.orderBy('account_number', 'asc');
  }

  async getTree(schema: string) {
    const accounts = await this.db.withSchema(schema)
      .table('accounts')
      .where({ is_deleted: false, is_active: true })
      .orderBy('account_number', 'asc');

    const accountMap = new Map();
    const roots: any[] = [];

    accounts.forEach((acc: any) => {
      accountMap.set(acc.id, { ...acc, children: [] });
    });

    accounts.forEach((acc: any) => {
      const node = accountMap.get(acc.id);
      if (acc.parent_account_id && accountMap.has(acc.parent_account_id)) {
        accountMap.get(acc.parent_account_id).children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  async getById(schema: string, id: string) {
    const account = await this.db.withSchema(schema).table('accounts')
      .where({ id, is_deleted: false }).first();
    if (!account) throw new AppError('Account not found', 404, 'NOT_FOUND');
    return account;
  }

  async create(ctx: ServiceContext, data: any) {
    const id = uuidv4();

    if (data.accountNumber) {
      const existing = await this.db.withSchema(ctx.tenantSchema).table('accounts')
        .where({ account_number: data.accountNumber, is_deleted: false }).first();
      if (existing) throw new AppError('Account number already exists', 409, 'DUPLICATE');
    }

    await this.db.withSchema(ctx.tenantSchema).table('accounts').insert({
      id,
      account_number: data.accountNumber,
      name: data.name,
      type: data.type,
      detail_type: data.detailType,
      description: data.description,
      currency: data.currency || 'AED',
      tax_code_id: data.taxCodeId,
      is_active: true,
      is_sub_account: !!data.parentAccountId,
      parent_account_id: data.parentAccountId,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    });

    await createAuditLog(this.db, {
      userId: ctx.userId, userName: ctx.userName,
      ipAddress: ctx.ipAddress, tenantSchema: ctx.tenantSchema,
    }, 'create', 'account', id, [{ field: 'name', newValue: data.name }]);

    return this.getById(ctx.tenantSchema, id);
  }

  async update(ctx: ServiceContext, id: string, data: any) {
    const existing = await this.getById(ctx.tenantSchema, id);

    if (existing.is_system_account && data.type && data.type !== existing.type) {
      throw new AppError('Cannot change type of system account', 400, 'SYSTEM_ACCOUNT');
    }

    const updates: Record<string, any> = { updated_at: new Date(), updated_by: ctx.userId };
    if (data.name) updates.name = data.name;
    if (data.accountNumber) updates.account_number = data.accountNumber;
    if (data.description !== undefined) updates.description = data.description;
    if (data.isActive !== undefined) updates.is_active = data.isActive;
    if (data.taxCodeId !== undefined) updates.tax_code_id = data.taxCodeId;
    if (data.parentAccountId !== undefined) {
      updates.parent_account_id = data.parentAccountId;
      updates.is_sub_account = !!data.parentAccountId;
    }

    await this.db.withSchema(ctx.tenantSchema).table('accounts').where({ id }).update(updates);
    return this.getById(ctx.tenantSchema, id);
  }

  async delete(ctx: ServiceContext, id: string) {
    const account = await this.getById(ctx.tenantSchema, id);

    if (account.is_system_account) {
      throw new AppError('Cannot delete system account', 400, 'SYSTEM_ACCOUNT');
    }

    // Check for transactions
    const hasTransactions = await this.db.withSchema(ctx.tenantSchema)
      .table('journal_entry_lines').where({ account_id: id }).first();

    if (hasTransactions) {
      throw new AppError('Cannot delete account with transactions. Mark as inactive instead.', 400, 'HAS_TRANSACTIONS');
    }

    await this.db.withSchema(ctx.tenantSchema).table('accounts').where({ id }).update({
      is_deleted: true, deleted_at: new Date(), updated_by: ctx.userId,
    });

    await createAuditLog(this.db, {
      userId: ctx.userId, userName: ctx.userName,
      ipAddress: ctx.ipAddress, tenantSchema: ctx.tenantSchema,
    }, 'delete', 'account', id, [{ field: 'name', oldValue: account.name }]);
  }

  async getActivity(schema: string, accountId: string, startDate?: string, endDate?: string) {
    let query = this.db.withSchema(schema).table('journal_entry_lines')
      .join(`${schema}.journal_entries`, 'journal_entries.id', 'journal_entry_lines.journal_entry_id')
      .where({ 'journal_entry_lines.account_id': accountId })
      .select(
        'journal_entries.date',
        'journal_entries.source_type',
        'journal_entries.source_id',
        'journal_entry_lines.description',
        'journal_entry_lines.debit_amount',
        'journal_entry_lines.credit_amount',
      );

    if (startDate) query = query.where('journal_entries.date', '>=', startDate);
    if (endDate) query = query.where('journal_entries.date', '<=', endDate);

    return query.orderBy('journal_entries.date', 'desc');
  }

  async merge(ctx: ServiceContext, sourceId: string, targetId: string) {
    const source = await this.getById(ctx.tenantSchema, sourceId);
    const target = await this.getById(ctx.tenantSchema, targetId);

    if (source.type !== target.type) {
      throw new AppError('Can only merge accounts of the same type', 400, 'TYPE_MISMATCH');
    }

    await this.db.withSchema(ctx.tenantSchema).table('journal_entry_lines')
      .where({ account_id: sourceId }).update({ account_id: targetId });

    await this.db.withSchema(ctx.tenantSchema).table('accounts')
      .where({ id: sourceId }).update({ is_deleted: true, deleted_at: new Date() });

    await createAuditLog(this.db, {
      userId: ctx.userId, userName: ctx.userName,
      ipAddress: ctx.ipAddress, tenantSchema: ctx.tenantSchema,
    }, 'update', 'account', targetId, [{
      field: 'merge', oldValue: source.name, newValue: `Merged from ${source.name}`,
    }]);
  }

  async importAccounts(ctx: ServiceContext, accounts: any[]) {
    let imported = 0;
    for (const acc of accounts) {
      await this.create(ctx, acc);
      imported++;
    }
    return { imported, total: accounts.length };
  }

  async exportAccounts(schema: string) {
    return this.db.withSchema(schema).table('accounts')
      .where({ is_deleted: false })
      .select('account_number', 'name', 'type', 'detail_type', 'description', 'is_active', 'is_sub_account')
      .orderBy('account_number', 'asc');
  }
}
