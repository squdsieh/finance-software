import { Request, Response } from 'express';
import { IntegrationsService } from './integrations.service';
import { asyncHandler } from '../../utils/async-handler';
import { AuthRequest } from '../../middleware/auth';
import { getServiceContext } from '../../types';

const service = new IntegrationsService();

export class IntegrationsController {
  // Webhook handlers (no auth)
  stripeWebhook = asyncHandler(async (req: Request, res: Response) => {
    const result = await service.handleStripeWebhook(req.headers, req.body);
    res.json({ received: true, ...result });
  });

  plaidWebhook = asyncHandler(async (req: Request, res: Response) => {
    const result = await service.handlePlaidWebhook(req.body);
    res.json({ received: true, ...result });
  });

  // Integration management
  list = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const integrations = await service.list(ctx.tenantSchema);
    res.json({ success: true, data: integrations });
  });

  getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const integration = await service.getById(ctx.tenantSchema, req.params.id);
    res.json({ success: true, data: integration });
  });

  connect = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.connect(ctx, req.params.provider, req.body);
    res.status(201).json({ success: true, data: result });
  });

  disconnect = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.disconnect(ctx, req.params.provider);
    res.json({ success: true, data: { message: 'Integration disconnected' } });
  });

  updateSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.updateSettings(ctx, req.params.id, req.body);
    res.json({ success: true, data: { message: 'Integration settings updated' } });
  });

  sync = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.sync(ctx, req.params.id);
    res.json({ success: true, data: result });
  });

  getSyncLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const logs = await service.getSyncLogs(ctx.tenantSchema, req.params.id, req.query);
    res.json({ success: true, data: logs });
  });

  // Stripe
  createStripeCheckout = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const session = await service.createStripeCheckout(ctx, req.body);
    res.json({ success: true, data: session });
  });

  createStripePortal = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const portal = await service.createStripePortal(ctx);
    res.json({ success: true, data: portal });
  });

  // Plaid
  createPlaidLinkToken = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const token = await service.createPlaidLinkToken(ctx);
    res.json({ success: true, data: token });
  });

  exchangePlaidToken = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.exchangePlaidToken(ctx, req.body);
    res.json({ success: true, data: result });
  });

  // Exchange rates
  syncExchangeRates = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.syncExchangeRates(ctx);
    res.json({ success: true, data: result });
  });
}
