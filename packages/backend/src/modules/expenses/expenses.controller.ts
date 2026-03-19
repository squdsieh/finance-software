import { Response } from 'express';
import { ExpensesService } from './expenses.service';
import { asyncHandler } from '../../utils/async-handler';
import { AuthRequest } from '../../middleware/auth';
import { getServiceContext } from '../../types';

const service = new ExpensesService();

export class ExpensesController {
  list = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.list(ctx.tenantSchema, req.query);
    res.json({ success: true, ...result });
  });

  getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const expense = await service.getById(ctx.tenantSchema, req.params.id);
    res.json({ success: true, data: expense });
  });

  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const expense = await service.create(ctx, req.body);
    res.status(201).json({ success: true, data: expense });
  });

  update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const expense = await service.update(ctx, req.params.id, req.body);
    res.json({ success: true, data: expense });
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.delete(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Expense deleted' } });
  });

  scanReceipt = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.scanReceipt(ctx, req.body);
    res.json({ success: true, data: result });
  });

  createMileage = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const entry = await service.createMileage(ctx, req.body);
    res.status(201).json({ success: true, data: entry });
  });

  listClaims = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const claims = await service.listClaims(ctx.tenantSchema, req.query);
    res.json({ success: true, data: claims });
  });

  createClaim = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const claim = await service.createClaim(ctx, req.body);
    res.status(201).json({ success: true, data: claim });
  });

  submitClaim = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.submitClaim(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Claim submitted' } });
  });

  approveClaim = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.approveClaim(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Claim approved' } });
  });

  rejectClaim = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.rejectClaim(ctx, req.params.id, req.body.comments);
    res.json({ success: true, data: { message: 'Claim rejected' } });
  });

  invoiceBillable = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.invoiceBillableExpenses(ctx, req.body.customerId);
    res.json({ success: true, data: result });
  });
}
