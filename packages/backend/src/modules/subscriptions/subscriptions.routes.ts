import { Router } from 'express';
import { SubscriptionsController } from './subscriptions.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';

const controller = new SubscriptionsController();
export const subscriptionsRouter = Router();
subscriptionsRouter.use(authenticate);
subscriptionsRouter.use(requireTenant);

// Current subscription
subscriptionsRouter.get('/current', controller.getCurrent);
subscriptionsRouter.post('/upgrade', authorize('billing:edit'), controller.upgrade);
subscriptionsRouter.post('/downgrade', authorize('billing:edit'), controller.downgrade);
subscriptionsRouter.post('/cancel', authorize('billing:edit'), controller.cancel);
subscriptionsRouter.post('/reactivate', authorize('billing:edit'), controller.reactivate);

// Plans
subscriptionsRouter.get('/plans', controller.listPlans);
subscriptionsRouter.get('/plans/:id', controller.getPlan);

// Feature gating
subscriptionsRouter.get('/features', controller.listFeatures);
subscriptionsRouter.get('/features/:feature/check', controller.checkFeature);

// Usage
subscriptionsRouter.get('/usage', controller.getUsage);
subscriptionsRouter.get('/usage/history', controller.getUsageHistory);

// Billing
subscriptionsRouter.get('/invoices', controller.listInvoices);
subscriptionsRouter.get('/invoices/:id', controller.getInvoice);
subscriptionsRouter.put('/payment-method', authorize('billing:edit'), controller.updatePaymentMethod);
