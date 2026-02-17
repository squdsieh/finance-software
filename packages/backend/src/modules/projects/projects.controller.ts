import { Response } from 'express';
import { ProjectsService } from './projects.service';
import { asyncHandler } from '../../utils/async-handler';
import { AuthRequest } from '../../middleware/auth';
import { getServiceContext } from '../../types';

const service = new ProjectsService();

export class ProjectsController {
  list = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.list(ctx.tenantSchema, req.query);
    res.json({ success: true, ...result });
  });

  getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const project = await service.getById(ctx.tenantSchema, req.params.id);
    res.json({ success: true, data: project });
  });

  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const project = await service.create(ctx, req.body);
    res.status(201).json({ success: true, data: project });
  });

  update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const project = await service.update(ctx, req.params.id, req.body);
    res.json({ success: true, data: project });
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.delete(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Project deleted' } });
  });

  getProfitability = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const profitability = await service.getProfitability(ctx.tenantSchema, req.params.id);
    res.json({ success: true, data: profitability });
  });

  getBudgetStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const budget = await service.getBudgetStatus(ctx.tenantSchema, req.params.id);
    res.json({ success: true, data: budget });
  });

  listTasks = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const tasks = await service.listTasks(ctx.tenantSchema, req.params.id);
    res.json({ success: true, data: tasks });
  });

  createTask = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const task = await service.createTask(ctx, req.params.id, req.body);
    res.status(201).json({ success: true, data: task });
  });

  updateTask = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const task = await service.updateTask(ctx, req.params.taskId, req.body);
    res.json({ success: true, data: task });
  });

  deleteTask = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.deleteTask(ctx, req.params.taskId);
    res.json({ success: true, data: { message: 'Task deleted' } });
  });

  listMembers = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const members = await service.listMembers(ctx.tenantSchema, req.params.id);
    res.json({ success: true, data: members });
  });

  addMember = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.addMember(ctx, req.params.id, req.body);
    res.status(201).json({ success: true, data: { message: 'Member added' } });
  });

  removeMember = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.removeMember(ctx, req.params.id, req.params.userId);
    res.json({ success: true, data: { message: 'Member removed' } });
  });

  listExpenses = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const expenses = await service.listExpenses(ctx.tenantSchema, req.params.id);
    res.json({ success: true, data: expenses });
  });

  addExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const expense = await service.addExpense(ctx, req.params.id, req.body);
    res.status(201).json({ success: true, data: expense });
  });
}
