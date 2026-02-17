import { Router } from 'express';
import { ProjectsController } from './projects.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';

const controller = new ProjectsController();
export const projectsRouter = Router();
projectsRouter.use(authenticate);
projectsRouter.use(requireTenant);

projectsRouter.get('/', controller.list);
projectsRouter.get('/:id', controller.getById);
projectsRouter.post('/', authorize('projects:create'), controller.create);
projectsRouter.put('/:id', authorize('projects:edit'), controller.update);
projectsRouter.delete('/:id', authorize('projects:delete'), controller.delete);
projectsRouter.get('/:id/profitability', controller.getProfitability);
projectsRouter.get('/:id/budget', controller.getBudgetStatus);

// Tasks
projectsRouter.get('/:id/tasks', controller.listTasks);
projectsRouter.post('/:id/tasks', authorize('projects:edit'), controller.createTask);
projectsRouter.put('/:id/tasks/:taskId', authorize('projects:edit'), controller.updateTask);
projectsRouter.delete('/:id/tasks/:taskId', authorize('projects:delete'), controller.deleteTask);

// Team members
projectsRouter.get('/:id/members', controller.listMembers);
projectsRouter.post('/:id/members', authorize('projects:edit'), controller.addMember);
projectsRouter.delete('/:id/members/:userId', authorize('projects:edit'), controller.removeMember);

// Expenses
projectsRouter.get('/:id/expenses', controller.listExpenses);
projectsRouter.post('/:id/expenses', authorize('projects:edit'), controller.addExpense);
