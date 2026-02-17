import { Router } from 'express';
import { AccountsController } from './accounts.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';

const controller = new AccountsController();
export const accountsRouter = Router();

accountsRouter.use(authenticate);
accountsRouter.use(requireTenant);

accountsRouter.get('/', controller.list);
accountsRouter.get('/tree', controller.getTree);
accountsRouter.get('/:id', controller.getById);
accountsRouter.post('/', authorize('settings:create'), controller.create);
accountsRouter.put('/:id', authorize('settings:edit'), controller.update);
accountsRouter.delete('/:id', authorize('settings:delete'), controller.delete);
accountsRouter.get('/:id/activity', controller.getActivity);
accountsRouter.post('/merge', authorize('settings:edit'), controller.merge);
accountsRouter.post('/import', authorize('settings:create'), controller.importAccounts);
accountsRouter.get('/export/csv', authorize('settings:export'), controller.exportAccounts);
