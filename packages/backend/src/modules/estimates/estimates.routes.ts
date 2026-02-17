import { Router } from 'express';
import { EstimatesController } from './estimates.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';

const controller = new EstimatesController();
export const estimatesRouter = Router();

estimatesRouter.use(authenticate);
estimatesRouter.use(requireTenant);

estimatesRouter.get('/', controller.list);
estimatesRouter.get('/:id', controller.getById);
estimatesRouter.post('/', authorize('estimates:create'), controller.create);
estimatesRouter.put('/:id', authorize('estimates:edit'), controller.update);
estimatesRouter.delete('/:id', authorize('estimates:delete'), controller.delete);
estimatesRouter.post('/:id/send', authorize('estimates:edit'), controller.send);
estimatesRouter.post('/:id/convert', authorize('invoices:create'), controller.convertToInvoice);
estimatesRouter.post('/:id/accept', controller.accept);
estimatesRouter.post('/:id/reject', controller.reject);
