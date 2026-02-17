import { Response } from 'express';
import { CustomersService } from './customers.service';
import { asyncHandler } from '../../utils/async-handler';
import { AuthRequest } from '../../middleware/auth';
import { getServiceContext } from '../../types';

const service = new CustomersService();

export class CustomersController {
  list = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.list(ctx.tenantSchema, {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 25,
      sortBy: req.query.sortBy as string || 'display_name',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'asc',
      search: req.query.search as string,
      isActive: req.query.isActive as string,
    });
    res.json({ success: true, ...result });
  });

  getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const customer = await service.getById(ctx.tenantSchema, req.params.id);
    res.json({ success: true, data: customer });
  });

  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const customer = await service.create(ctx, req.body);
    res.status(201).json({ success: true, data: customer });
  });

  update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const customer = await service.update(ctx, req.params.id, req.body);
    res.json({ success: true, data: customer });
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.delete(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Customer deleted' } });
  });

  getTransactions = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const transactions = await service.getTransactions(ctx.tenantSchema, req.params.id);
    res.json({ success: true, data: transactions });
  });

  getStatement = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const statement = await service.getStatement(ctx.tenantSchema, req.params.id, {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    });
    res.json({ success: true, data: statement });
  });

  sendStatement = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.sendStatement(ctx, req.params.id, req.body);
    res.json({ success: true, data: { message: 'Statement sent' } });
  });

  importCustomers = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.importCustomers(ctx, req.body.customers);
    res.json({ success: true, data: result });
  });

  exportCustomers = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const data = await service.exportCustomers(ctx.tenantSchema);
    res.json({ success: true, data });
  });
}
