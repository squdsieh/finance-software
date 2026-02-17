import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/connection';
import { AppError } from '../../utils/app-error';
import { paginate } from '../../utils/pagination';
import { ServiceContext } from '../../types';

export class BankingService {
  private db = getDatabase();

  async listAccounts(schema: string) {
    return this.db.withSchema(schema).table('bank_accounts').where({ is_deleted: false }).orderBy('name');
  }
  async createAccount(ctx: ServiceContext, data: any) {
    const id = uuidv4();
    await this.db.withSchema(ctx.tenantSchema).table('bank_accounts').insert({
      id, name: data.name, account_type: data.accountType,
      institution_name: data.institutionName, currency: data.currency || 'AED',
      chart_account_id: data.chartAccountId, created_by: ctx.userId, updated_by: ctx.userId,
    });
    return { id };
  }
  async updateAccount(ctx: ServiceContext, id: string, data: any) {
    const updates: Record<string, any> = { updated_at: new Date(), updated_by: ctx.userId };
    if (data.name) updates.name = data.name;
    if (data.isActive !== undefined) updates.is_active = data.isActive;
    await this.db.withSchema(ctx.tenantSchema).table('bank_accounts').where({ id }).update(updates);
    return { id };
  }
  async connectBank(_ctx: ServiceContext, _id: string, _data: any) {
    return { message: 'Plaid integration placeholder - would initiate Plaid Link' };
  }
  async syncTransactions(_ctx: ServiceContext, _id: string) {
    return { message: 'Bank sync placeholder', transactionsImported: 0 };
  }
  async importTransactions(ctx: ServiceContext, accountId: string, data: any) {
    let imported = 0;
    for (const txn of (data.transactions || [])) {
      await this.db.withSchema(ctx.tenantSchema).table('bank_transactions').insert({
        id: uuidv4(), bank_account_id: accountId, date: txn.date,
        description: txn.description, amount: txn.amount,
        type: parseFloat(txn.amount) >= 0 ? 'credit' : 'debit',
      });
      imported++;
    }
    return { imported };
  }
  async listTransactions(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('bank_transactions');
    if (options.bankAccountId) query = query.where({ bank_account_id: options.bankAccountId });
    if (options.status) query = query.where({ status: options.status });
    return paginate(query, {
      page: parseInt(options.page) || 1, limit: parseInt(options.limit) || 25,
      sortBy: 'date', sortOrder: 'desc',
    });
  }
  async categorizeTransaction(ctx: ServiceContext, id: string, data: any) {
    await this.db.withSchema(ctx.tenantSchema).table('bank_transactions').where({ id }).update({
      category_account_id: data.accountId, vendor_id: data.vendorId,
      customer_id: data.customerId, status: 'categorized', updated_at: new Date(),
    });
  }
  async matchTransaction(ctx: ServiceContext, id: string, data: any) {
    await this.db.withSchema(ctx.tenantSchema).table('bank_transactions').where({ id }).update({
      matched_transaction_id: data.matchedId, matched_transaction_type: data.matchedType,
      status: 'matched', updated_at: new Date(),
    });
  }
  async splitTransaction(_ctx: ServiceContext, _id: string, _data: any) {
    return { message: 'Split transaction placeholder' };
  }
  async excludeTransaction(ctx: ServiceContext, id: string) {
    await this.db.withSchema(ctx.tenantSchema).table('bank_transactions').where({ id }).update({
      status: 'excluded', updated_at: new Date(),
    });
  }
  async listRules(schema: string) {
    return this.db.withSchema(schema).table('bank_rules').where({ is_active: true }).orderBy('priority');
  }
  async createRule(ctx: ServiceContext, data: any) {
    const id = uuidv4();
    await this.db.withSchema(ctx.tenantSchema).table('bank_rules').insert({
      id, name: data.name, priority: data.priority || 0,
      conditions: JSON.stringify(data.conditions), actions: JSON.stringify(data.actions),
      auto_confirm: data.autoConfirm || false, created_by: ctx.userId, updated_by: ctx.userId,
    });
    return { id };
  }
  async updateRule(ctx: ServiceContext, id: string, data: any) {
    const updates: Record<string, any> = { updated_at: new Date(), updated_by: ctx.userId };
    if (data.name) updates.name = data.name;
    if (data.priority !== undefined) updates.priority = data.priority;
    if (data.conditions) updates.conditions = JSON.stringify(data.conditions);
    if (data.actions) updates.actions = JSON.stringify(data.actions);
    await this.db.withSchema(ctx.tenantSchema).table('bank_rules').where({ id }).update(updates);
    return { id };
  }
  async deleteRule(ctx: ServiceContext, id: string) {
    await this.db.withSchema(ctx.tenantSchema).table('bank_rules').where({ id }).update({ is_active: false });
  }
  async listReconciliations(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('reconciliations');
    if (options.bankAccountId) query = query.where({ bank_account_id: options.bankAccountId });
    return query.orderBy('statement_date', 'desc');
  }
  async startReconciliation(ctx: ServiceContext, data: any) {
    const id = uuidv4();
    await this.db.withSchema(ctx.tenantSchema).table('reconciliations').insert({
      id, bank_account_id: data.bankAccountId, statement_date: data.statementDate,
      statement_ending_balance: data.statementEndingBalance,
      beginning_balance: data.beginningBalance || 0, created_by: ctx.userId,
    });
    return { id };
  }
  async updateReconciliation(ctx: ServiceContext, id: string, data: any) {
    const updates: Record<string, any> = { updated_at: new Date() };
    if (data.clearedDeposits !== undefined) updates.cleared_deposits = data.clearedDeposits;
    if (data.clearedPayments !== undefined) updates.cleared_payments = data.clearedPayments;
    await this.db.withSchema(ctx.tenantSchema).table('reconciliations').where({ id }).update(updates);
    return { id };
  }
  async completeReconciliation(ctx: ServiceContext, id: string) {
    await this.db.withSchema(ctx.tenantSchema).table('reconciliations').where({ id }).update({
      status: 'completed', completed_at: new Date(), completed_by: ctx.userId,
    });
  }
  async undoReconciliation(ctx: ServiceContext, id: string) {
    await this.db.withSchema(ctx.tenantSchema).table('reconciliations').where({ id }).update({
      status: 'in_progress', completed_at: null, completed_by: null, updated_at: new Date(),
    });
  }
  async createTransfer(ctx: ServiceContext, data: any) {
    const jeId = uuidv4();
    await this.db.withSchema(ctx.tenantSchema).table('journal_entries').insert({
      id: jeId, entry_number: `TRF-${Date.now()}`, date: data.date,
      memo: `Transfer: ${data.fromAccountName} to ${data.toAccountName}`,
      source_type: 'transfer', created_by: ctx.userId, updated_by: ctx.userId,
    });
    await this.db.withSchema(ctx.tenantSchema).table('journal_entry_lines').insert([
      { id: uuidv4(), journal_entry_id: jeId, account_id: data.toAccountId, debit_amount: data.amount, credit_amount: 0, sort_order: 0 },
      { id: uuidv4(), journal_entry_id: jeId, account_id: data.fromAccountId, debit_amount: 0, credit_amount: data.amount, sort_order: 1 },
    ]);
    return { journalEntryId: jeId };
  }
  async createDeposit(ctx: ServiceContext, data: any) {
    const id = uuidv4();
    await this.db.withSchema(ctx.tenantSchema).table('bank_deposits').insert({
      id, bank_account_id: data.bankAccountId, deposit_date: data.depositDate,
      total_amount: data.totalAmount, memo: data.memo,
      payment_ids: JSON.stringify(data.paymentIds || []), created_by: ctx.userId,
    });
    if (data.paymentIds?.length) {
      await this.db.withSchema(ctx.tenantSchema).table('payments_received')
        .whereIn('id', data.paymentIds).update({ is_deposited: true, bank_deposit_id: id });
    }
    return { id };
  }
}
