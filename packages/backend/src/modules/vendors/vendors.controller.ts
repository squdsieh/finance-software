import { Response } from 'express';
import { VendorsService } from './vendors.service';
import { asyncHandler } from '../../utils/async-handler';
import { AuthRequest } from '../../middleware/auth';
import { getServiceContext } from '../../types';

const service = new VendorsService();

export class VendorsController {
  list = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.list(ctx.tenantSchema, {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 25,
      sortBy: req.query.sortBy as string || 'display_name',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'asc',
      search: req.query.search as string,
    });
    res.json({ success: true, ...result });
  });

  getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const vendor = await service.getById(ctx.tenantSchema, req.params.id);
    res.json({ success: true, data: vendor });
  });

  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const vendor = await service.create(ctx, req.body);
    res.status(201).json({ success: true, data: vendor });
  });

  update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const vendor = await service.update(ctx, req.params.id, req.body);
    res.json({ success: true, data: vendor });
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.delete(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Vendor deleted' } });
  });

  getTransactions = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const transactions = await service.getTransactions(ctx.tenantSchema, req.params.id);
    res.json({ success: true, data: transactions });
  });

  importVendors = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.importVendors(ctx, req.body.vendors);
    res.json({ success: true, data: result });
  });

  exportVendors = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const data = await service.exportVendors(ctx.tenantSchema);
    res.json({ success: true, data });
  });
}
