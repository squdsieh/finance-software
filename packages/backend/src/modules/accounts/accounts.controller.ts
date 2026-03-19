import { Response } from 'express';
import { AccountsService } from './accounts.service';
import { asyncHandler } from '../../utils/async-handler';
import { AuthRequest } from '../../middleware/auth';
import { getServiceContext } from '../../types';

const service = new AccountsService();

export class AccountsController {
  list = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const { type, isActive, search } = req.query;
    const accounts = await service.list(ctx.tenantSchema, {
      type: type as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      search: search as string,
    });
    res.json({ success: true, data: accounts });
  });

  getTree = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const tree = await service.getTree(ctx.tenantSchema);
    res.json({ success: true, data: tree });
  });

  getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const account = await service.getById(ctx.tenantSchema, req.params.id);
    res.json({ success: true, data: account });
  });

  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const account = await service.create(ctx, req.body);
    res.status(201).json({ success: true, data: account });
  });

  update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const account = await service.update(ctx, req.params.id, req.body);
    res.json({ success: true, data: account });
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.delete(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Account deleted' } });
  });

  getActivity = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const { startDate, endDate } = req.query;
    const activity = await service.getActivity(ctx.tenantSchema, req.params.id, startDate as string, endDate as string);
    res.json({ success: true, data: activity });
  });

  merge = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.merge(ctx, req.body.sourceAccountId, req.body.targetAccountId);
    res.json({ success: true, data: { message: 'Accounts merged' } });
  });

  importAccounts = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.importAccounts(ctx, req.body.accounts);
    res.json({ success: true, data: result });
  });

  exportAccounts = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const data = await service.exportAccounts(ctx.tenantSchema);
    res.json({ success: true, data });
  });
}
