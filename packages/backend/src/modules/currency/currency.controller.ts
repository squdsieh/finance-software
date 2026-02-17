import { Response } from 'express';
import { CurrencyService } from './currency.service';
import { asyncHandler } from '../../utils/async-handler';
import { AuthRequest } from '../../middleware/auth';
import { getServiceContext } from '../../types';

const service = new CurrencyService();

export class CurrencyController {
  list = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const currencies = await service.list(ctx.tenantSchema);
    res.json({ success: true, data: currencies });
  });

  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const currency = await service.create(ctx, req.body);
    res.status(201).json({ success: true, data: currency });
  });

  update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const currency = await service.update(ctx, req.params.id, req.body);
    res.json({ success: true, data: currency });
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.delete(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Currency deleted' } });
  });

  listRates = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const rates = await service.listRates(ctx.tenantSchema, req.query);
    res.json({ success: true, data: rates });
  });

  createRate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const rate = await service.createRate(ctx, req.body);
    res.status(201).json({ success: true, data: rate });
  });

  updateRate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const rate = await service.updateRate(ctx, req.params.id, req.body);
    res.json({ success: true, data: rate });
  });

  syncRates = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.syncRates(ctx);
    res.json({ success: true, data: result });
  });

  getGainLoss = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const report = await service.getGainLoss(ctx.tenantSchema, req.query);
    res.json({ success: true, data: report });
  });

  runRevaluation = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.runRevaluation(ctx, req.body);
    res.json({ success: true, data: result });
  });

  revaluationHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const history = await service.revaluationHistory(ctx.tenantSchema);
    res.json({ success: true, data: history });
  });
}
