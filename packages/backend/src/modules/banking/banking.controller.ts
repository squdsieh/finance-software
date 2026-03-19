import { Response } from 'express';
import { BankingService } from './banking.service';
import { asyncHandler } from '../../utils/async-handler';
import { AuthRequest } from '../../middleware/auth';
import { getServiceContext } from '../../types';

const service = new BankingService();

export class BankingController {
  listAccounts = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const accounts = await service.listAccounts(ctx.tenantSchema);
    res.json({ success: true, data: accounts });
  });
  createAccount = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const account = await service.createAccount(ctx, req.body);
    res.status(201).json({ success: true, data: account });
  });
  updateAccount = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const account = await service.updateAccount(ctx, req.params.id, req.body);
    res.json({ success: true, data: account });
  });
  connectBank = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.connectBank(ctx, req.params.id, req.body);
    res.json({ success: true, data: result });
  });
  syncTransactions = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.syncTransactions(ctx, req.params.id);
    res.json({ success: true, data: result });
  });
  importTransactions = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.importTransactions(ctx, req.params.id, req.body);
    res.json({ success: true, data: result });
  });
  listTransactions = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.listTransactions(ctx.tenantSchema, req.query);
    res.json({ success: true, ...result });
  });
  categorizeTransaction = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.categorizeTransaction(ctx, req.params.id, req.body);
    res.json({ success: true, data: { message: 'Transaction categorized' } });
  });
  matchTransaction = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.matchTransaction(ctx, req.params.id, req.body);
    res.json({ success: true, data: { message: 'Transaction matched' } });
  });
  splitTransaction = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.splitTransaction(ctx, req.params.id, req.body);
    res.json({ success: true, data: { message: 'Transaction split' } });
  });
  excludeTransaction = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.excludeTransaction(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Transaction excluded' } });
  });
  listRules = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const rules = await service.listRules(ctx.tenantSchema);
    res.json({ success: true, data: rules });
  });
  createRule = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const rule = await service.createRule(ctx, req.body);
    res.status(201).json({ success: true, data: rule });
  });
  updateRule = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const rule = await service.updateRule(ctx, req.params.id, req.body);
    res.json({ success: true, data: rule });
  });
  deleteRule = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.deleteRule(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Rule deleted' } });
  });
  listReconciliations = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.listReconciliations(ctx.tenantSchema, req.query);
    res.json({ success: true, data: result });
  });
  startReconciliation = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const recon = await service.startReconciliation(ctx, req.body);
    res.status(201).json({ success: true, data: recon });
  });
  updateReconciliation = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const recon = await service.updateReconciliation(ctx, req.params.id, req.body);
    res.json({ success: true, data: recon });
  });
  completeReconciliation = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.completeReconciliation(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Reconciliation completed' } });
  });
  undoReconciliation = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.undoReconciliation(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Reconciliation undone' } });
  });
  createTransfer = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const transfer = await service.createTransfer(ctx, req.body);
    res.status(201).json({ success: true, data: transfer });
  });
  createDeposit = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const deposit = await service.createDeposit(ctx, req.body);
    res.status(201).json({ success: true, data: deposit });
  });
}
