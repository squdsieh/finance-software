import { Response } from 'express';
import { BudgetsService } from './budgets.service';
import { asyncHandler } from '../../utils/async-handler';
import { AuthRequest } from '../../middleware/auth';
import { getServiceContext } from '../../types';

const service = new BudgetsService();

export class BudgetsController {
  list = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const budgets = await service.list(ctx.tenantSchema, req.query);
    res.json({ success: true, data: budgets });
  });

  getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const budget = await service.getById(ctx.tenantSchema, req.params.id);
    res.json({ success: true, data: budget });
  });

  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const budget = await service.create(ctx, req.body);
    res.status(201).json({ success: true, data: budget });
  });

  update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const budget = await service.update(ctx, req.params.id, req.body);
    res.json({ success: true, data: budget });
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.delete(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Budget deleted' } });
  });

  duplicate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const budget = await service.duplicate(ctx, req.params.id, req.body);
    res.status(201).json({ success: true, data: budget });
  });

  lock = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.lock(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Budget locked' } });
  });

  getLines = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const lines = await service.getLines(ctx.tenantSchema, req.params.id);
    res.json({ success: true, data: lines });
  });

  updateLines = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.updateLines(ctx, req.params.id, req.body);
    res.json({ success: true, data: { message: 'Budget lines updated' } });
  });

  budgetVsActual = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const report = await service.budgetVsActual(ctx.tenantSchema, req.params.id, req.query);
    res.json({ success: true, data: report });
  });

  varianceReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const report = await service.varianceReport(ctx.tenantSchema, req.params.id, req.query);
    res.json({ success: true, data: report });
  });
}
