import { Router } from 'express';
import { IntegrationsController } from './integrations.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';

const controller = new IntegrationsController();
export const integrationsRouter = Router();

// Webhook endpoints (no auth required - validated by signature)
integrationsRouter.post('/webhooks/stripe', controller.stripeWebhook);
integrationsRouter.post('/webhooks/plaid', controller.plaidWebhook);

// Authenticated routes
integrationsRouter.use(authenticate);
integrationsRouter.use(requireTenant);

// Integration management
integrationsRouter.get('/', controller.list);
integrationsRouter.get('/:id', controller.getById);
integrationsRouter.post('/:provider/connect', authorize('integrations:create'), controller.connect);
integrationsRouter.post('/:provider/disconnect', authorize('integrations:delete'), controller.disconnect);
integrationsRouter.put('/:id/settings', authorize('integrations:edit'), controller.updateSettings);
integrationsRouter.post('/:id/sync', authorize('integrations:edit'), controller.sync);
integrationsRouter.get('/:id/logs', controller.getSyncLogs);

// Stripe
integrationsRouter.post('/stripe/create-checkout', authorize('integrations:create'), controller.createStripeCheckout);
integrationsRouter.post('/stripe/create-portal', authorize('integrations:create'), controller.createStripePortal);

// Plaid
integrationsRouter.post('/plaid/create-link-token', authorize('integrations:create'), controller.createPlaidLinkToken);
integrationsRouter.post('/plaid/exchange-token', authorize('integrations:create'), controller.exchangePlaidToken);

// Exchange rates
integrationsRouter.post('/exchange-rates/sync', authorize('settings:edit'), controller.syncExchangeRates);
