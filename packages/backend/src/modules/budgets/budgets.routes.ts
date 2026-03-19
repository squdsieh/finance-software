import { Router } from 'express';
import { BudgetsController } from './budgets.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';

const controller = new BudgetsController();
export const budgetsRouter = Router();
budgetsRouter.use(authenticate);
budgetsRouter.use(requireTenant);

budgetsRouter.get('/', controller.list);
budgetsRouter.get('/:id', controller.getById);
budgetsRouter.post('/', authorize('budgets:create'), controller.create);
budgetsRouter.put('/:id', authorize('budgets:edit'), controller.update);
budgetsRouter.delete('/:id', authorize('budgets:delete'), controller.delete);
budgetsRouter.post('/:id/duplicate', authorize('budgets:create'), controller.duplicate);
budgetsRouter.post('/:id/lock', authorize('budgets:approve'), controller.lock);

// Budget lines
budgetsRouter.get('/:id/lines', controller.getLines);
budgetsRouter.put('/:id/lines', authorize('budgets:edit'), controller.updateLines);

// Budget vs Actual
budgetsRouter.get('/:id/vs-actual', controller.budgetVsActual);
budgetsRouter.get('/:id/variance', controller.varianceReport);
