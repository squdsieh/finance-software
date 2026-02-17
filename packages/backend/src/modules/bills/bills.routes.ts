import { Router } from 'express';
import { BillsController } from './bills.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';

const controller = new BillsController();
export const billsRouter = Router();

billsRouter.use(authenticate);
billsRouter.use(requireTenant);

billsRouter.get('/', controller.list);
billsRouter.get('/:id', controller.getById);
billsRouter.post('/', authorize('bills:create'), controller.create);
billsRouter.put('/:id', authorize('bills:edit'), controller.update);
billsRouter.delete('/:id', authorize('bills:delete'), controller.delete);
billsRouter.post('/:id/payment', authorize('bills:edit'), controller.recordPayment);
billsRouter.post('/:id/approve', authorize('bills:approve'), controller.approve);
billsRouter.post('/:id/void', authorize('bills:edit'), controller.voidBill);

// Purchase Orders
billsRouter.get('/purchase-orders', controller.listPurchaseOrders);
billsRouter.post('/purchase-orders', authorize('bills:create'), controller.createPurchaseOrder);
billsRouter.put('/purchase-orders/:id', authorize('bills:edit'), controller.updatePurchaseOrder);
billsRouter.post('/purchase-orders/:id/convert', authorize('bills:create'), controller.convertPOToBill);
