import { Response } from 'express';
import { JournalEntriesService } from './journal-entries.service';
import { asyncHandler } from '../../utils/async-handler';
import { AuthRequest } from '../../middleware/auth';
import { getServiceContext } from '../../types';

const service = new JournalEntriesService();

export class JournalEntriesController {
  list = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.list(ctx.tenantSchema, req.query);
    res.json({ success: true, ...result });
  });

  getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const entry = await service.getById(ctx.tenantSchema, req.params.id);
    res.json({ success: true, data: entry });
  });

  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const entry = await service.create(ctx, req.body);
    res.status(201).json({ success: true, data: entry });
  });

  update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const entry = await service.update(ctx, req.params.id, req.body);
    res.json({ success: true, data: entry });
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.delete(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Journal entry deleted' } });
  });

  post = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.postEntry(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Journal entry posted' } });
  });

  reverse = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const reversed = await service.reverse(ctx, req.params.id, req.body);
    res.status(201).json({ success: true, data: reversed });
  });

  duplicate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const duplicated = await service.duplicate(ctx, req.params.id);
    res.status(201).json({ success: true, data: duplicated });
  });

  listRecurring = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const entries = await service.listRecurring(ctx.tenantSchema);
    res.json({ success: true, data: entries });
  });

  createRecurring = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const entry = await service.createRecurring(ctx, req.body);
    res.status(201).json({ success: true, data: entry });
  });

  updateRecurring = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const entry = await service.updateRecurring(ctx, req.params.id, req.body);
    res.json({ success: true, data: entry });
  });

  deleteRecurring = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.deleteRecurring(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Recurring entry deleted' } });
  });

  generateFromRecurring = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const entry = await service.generateFromRecurring(ctx, req.params.id);
    res.status(201).json({ success: true, data: entry });
  });
}
