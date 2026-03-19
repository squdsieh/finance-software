import { Router } from 'express';
import { CustomersController } from './customers.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';
import { validate } from '../../middleware/validate';
import { createCustomerSchema, updateCustomerSchema, paginationSchema } from '@cloudbooks/shared';

const controller = new CustomersController();
export const customersRouter = Router();

customersRouter.use(authenticate);
customersRouter.use(requireTenant);

customersRouter.get('/', validate(paginationSchema, 'query'), controller.list);
customersRouter.get('/:id', controller.getById);
customersRouter.post('/', authorize('customers:create'), validate(createCustomerSchema), controller.create);
customersRouter.put('/:id', authorize('customers:edit'), validate(updateCustomerSchema), controller.update);
customersRouter.delete('/:id', authorize('customers:delete'), controller.delete);
customersRouter.get('/:id/transactions', controller.getTransactions);
customersRouter.get('/:id/statement', controller.getStatement);
customersRouter.post('/:id/statement/send', controller.sendStatement);
customersRouter.post('/import', authorize('customers:create'), controller.importCustomers);
customersRouter.get('/export/csv', authorize('customers:export'), controller.exportCustomers);
