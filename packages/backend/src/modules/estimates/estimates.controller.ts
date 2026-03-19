import { Response } from 'express';
import { EstimatesService } from './estimates.service';
import { asyncHandler } from '../../utils/async-handler';
import { AuthRequest } from '../../middleware/auth';
import { getServiceContext } from '../../types';

const service = new EstimatesService();

export class EstimatesController {
  list = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.list(ctx.tenantSchema, req.query);
    res.json({ success: true, ...result });
  });

  getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const estimate = await service.getById(ctx.tenantSchema, req.params.id);
    res.json({ success: true, data: estimate });
  });

  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const estimate = await service.create(ctx, req.body);
    res.status(201).json({ success: true, data: estimate });
  });

  update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const estimate = await service.update(ctx, req.params.id, req.body);
    res.json({ success: true, data: estimate });
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.delete(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Estimate deleted' } });
  });

  send = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.send(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Estimate sent' } });
  });

  convertToInvoice = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const invoice = await service.convertToInvoice(ctx, req.params.id);
    res.status(201).json({ success: true, data: invoice });
  });

  accept = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.accept(ctx, req.params.id, req.body.signature);
    res.json({ success: true, data: { message: 'Estimate accepted' } });
  });

  reject = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.reject(ctx, req.params.id, req.body.reason);
    res.json({ success: true, data: { message: 'Estimate rejected' } });
  });
}
