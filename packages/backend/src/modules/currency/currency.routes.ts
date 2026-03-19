import { Router } from 'express';
import { CurrencyController } from './currency.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';

const controller = new CurrencyController();
export const currencyRouter = Router();
currencyRouter.use(authenticate);
currencyRouter.use(requireTenant);

currencyRouter.get('/', controller.list);
currencyRouter.post('/', authorize('settings:edit'), controller.create);
currencyRouter.put('/:id', authorize('settings:edit'), controller.update);
currencyRouter.delete('/:id', authorize('settings:edit'), controller.delete);

// Exchange rates
currencyRouter.get('/rates', controller.listRates);
currencyRouter.post('/rates', authorize('settings:edit'), controller.createRate);
currencyRouter.put('/rates/:id', authorize('settings:edit'), controller.updateRate);
currencyRouter.post('/rates/sync', authorize('settings:edit'), controller.syncRates);

// Gain/Loss
currencyRouter.get('/gain-loss', controller.getGainLoss);
currencyRouter.post('/revaluation', authorize('journal:create'), controller.runRevaluation);
currencyRouter.get('/revaluation/history', controller.revaluationHistory);
