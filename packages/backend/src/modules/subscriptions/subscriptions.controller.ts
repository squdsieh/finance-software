import { Response } from 'express';
import { SubscriptionsService } from './subscriptions.service';
import { asyncHandler } from '../../utils/async-handler';
import { AuthRequest } from '../../middleware/auth';
import { getServiceContext } from '../../types';

const service = new SubscriptionsService();

export class SubscriptionsController {
  getCurrent = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const subscription = await service.getCurrent(ctx.tenantSchema);
    res.json({ success: true, data: subscription });
  });

  upgrade = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.upgrade(ctx, req.body);
    res.json({ success: true, data: result });
  });

  downgrade = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.downgrade(ctx, req.body);
    res.json({ success: true, data: result });
  });

  cancel = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.cancel(ctx, req.body);
    res.json({ success: true, data: result });
  });

  reactivate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.reactivate(ctx);
    res.json({ success: true, data: result });
  });

  listPlans = asyncHandler(async (req: AuthRequest, res: Response) => {
    const plans = await service.listPlans();
    res.json({ success: true, data: plans });
  });

  getPlan = asyncHandler(async (req: AuthRequest, res: Response) => {
    const plan = await service.getPlan(req.params.id);
    res.json({ success: true, data: plan });
  });

  listFeatures = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const features = await service.listFeatures(ctx.tenantSchema);
    res.json({ success: true, data: features });
  });

  checkFeature = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.checkFeature(ctx.tenantSchema, req.params.feature);
    res.json({ success: true, data: result });
  });

  getUsage = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const usage = await service.getUsage(ctx.tenantSchema);
    res.json({ success: true, data: usage });
  });

  getUsageHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const history = await service.getUsageHistory(ctx.tenantSchema, req.query);
    res.json({ success: true, data: history });
  });

  listInvoices = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const invoices = await service.listInvoices(ctx.tenantSchema);
    res.json({ success: true, data: invoices });
  });

  getInvoice = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const invoice = await service.getInvoice(ctx.tenantSchema, req.params.id);
    res.json({ success: true, data: invoice });
  });

  updatePaymentMethod = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.updatePaymentMethod(ctx, req.body);
    res.json({ success: true, data: { message: 'Payment method updated' } });
  });
}
