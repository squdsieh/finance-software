import { Router } from 'express';
import { ExpensesController } from './expenses.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';

const controller = new ExpensesController();
export const expensesRouter = Router();

expensesRouter.use(authenticate);
expensesRouter.use(requireTenant);

expensesRouter.get('/', controller.list);
expensesRouter.get('/:id', controller.getById);
expensesRouter.post('/', authorize('expenses:create'), controller.create);
expensesRouter.put('/:id', authorize('expenses:edit'), controller.update);
expensesRouter.delete('/:id', authorize('expenses:delete'), controller.delete);
expensesRouter.post('/receipt-scan', authorize('expenses:create'), controller.scanReceipt);
expensesRouter.post('/mileage', authorize('expenses:create'), controller.createMileage);
expensesRouter.get('/claims', controller.listClaims);
expensesRouter.post('/claims', authorize('expenses:create'), controller.createClaim);
expensesRouter.post('/claims/:id/submit', controller.submitClaim);
expensesRouter.post('/claims/:id/approve', authorize('expenses:approve'), controller.approveClaim);
expensesRouter.post('/claims/:id/reject', authorize('expenses:approve'), controller.rejectClaim);
expensesRouter.post('/billable/invoice', authorize('invoices:create'), controller.invoiceBillable);
