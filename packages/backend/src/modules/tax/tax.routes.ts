import { Router } from 'express';
import { TaxController } from './tax.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';

const controller = new TaxController();
export const taxRouter = Router();
taxRouter.use(authenticate);
taxRouter.use(requireTenant);

// Tax rates
taxRouter.get('/rates', controller.listRates);
taxRouter.get('/rates/:id', controller.getRate);
taxRouter.post('/rates', authorize('tax:create'), controller.createRate);
taxRouter.put('/rates/:id', authorize('tax:edit'), controller.updateRate);
taxRouter.delete('/rates/:id', authorize('tax:delete'), controller.deleteRate);

// Tax groups (combined rates)
taxRouter.get('/groups', controller.listGroups);
taxRouter.post('/groups', authorize('tax:create'), controller.createGroup);
taxRouter.put('/groups/:id', authorize('tax:edit'), controller.updateGroup);
taxRouter.delete('/groups/:id', authorize('tax:delete'), controller.deleteGroup);

// VAT returns
taxRouter.get('/returns', controller.listReturns);
taxRouter.get('/returns/:id', controller.getReturn);
taxRouter.post('/returns', authorize('tax:create'), controller.createReturn);
taxRouter.put('/returns/:id', authorize('tax:edit'), controller.updateReturn);
taxRouter.post('/returns/:id/submit', authorize('tax:approve'), controller.submitReturn);
taxRouter.post('/returns/:id/file', authorize('tax:approve'), controller.fileReturn);

// UAE FTA
taxRouter.get('/fta/validate-trn', controller.validateTRN);
taxRouter.get('/fta/export/:returnId', controller.exportForFTA);

// Tax reports
taxRouter.get('/reports/liability', controller.taxLiabilityReport);
taxRouter.get('/reports/collected', controller.taxCollectedReport);
taxRouter.get('/reports/paid', controller.taxPaidReport);

// Tax settings
taxRouter.get('/settings', controller.getSettings);
taxRouter.put('/settings', authorize('tax:edit'), controller.updateSettings);
