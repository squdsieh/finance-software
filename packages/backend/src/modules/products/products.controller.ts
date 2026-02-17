import { Response } from 'express';
import { ProductsService } from './products.service';
import { asyncHandler } from '../../utils/async-handler';
import { AuthRequest } from '../../middleware/auth';
import { getServiceContext } from '../../types';

const service = new ProductsService();

export class ProductsController {
  list = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.list(ctx.tenantSchema, {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 25,
      type: req.query.type as string,
      search: req.query.search as string,
    });
    res.json({ success: true, ...result });
  });

  getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const product = await service.getById(ctx.tenantSchema, req.params.id);
    res.json({ success: true, data: product });
  });

  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const product = await service.create(ctx, req.body);
    res.status(201).json({ success: true, data: product });
  });

  update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const product = await service.update(ctx, req.params.id, req.body);
    res.json({ success: true, data: product });
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.delete(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Product deleted' } });
  });

  importProducts = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.importProducts(ctx, req.body.products);
    res.json({ success: true, data: result });
  });

  exportProducts = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const data = await service.exportProducts(ctx.tenantSchema);
    res.json({ success: true, data });
  });
}
