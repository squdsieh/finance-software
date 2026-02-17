import { Router } from 'express';
import { VendorsController } from './vendors.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';

const controller = new VendorsController();
export const vendorsRouter = Router();

vendorsRouter.use(authenticate);
vendorsRouter.use(requireTenant);

vendorsRouter.get('/', controller.list);
vendorsRouter.get('/:id', controller.getById);
vendorsRouter.post('/', authorize('vendors:create'), controller.create);
vendorsRouter.put('/:id', authorize('vendors:edit'), controller.update);
vendorsRouter.delete('/:id', authorize('vendors:delete'), controller.delete);
vendorsRouter.get('/:id/transactions', controller.getTransactions);
vendorsRouter.post('/import', authorize('vendors:create'), controller.importVendors);
vendorsRouter.get('/export/csv', authorize('vendors:export'), controller.exportVendors);
