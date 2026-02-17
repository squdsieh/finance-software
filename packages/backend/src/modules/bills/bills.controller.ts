import { Response } from 'express';
import { BillsService } from './bills.service';
import { asyncHandler } from '../../utils/async-handler';
import { AuthRequest } from '../../middleware/auth';
import { getServiceContext } from '../../types';

const service = new BillsService();

export class BillsController {
  list = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.list(ctx.tenantSchema, req.query);
    res.json({ success: true, ...result });
  });

  getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const bill = await service.getById(ctx.tenantSchema, req.params.id);
    res.json({ success: true, data: bill });
  });

  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const bill = await service.create(ctx, req.body);
    res.status(201).json({ success: true, data: bill });
  });

  update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const bill = await service.update(ctx, req.params.id, req.body);
    res.json({ success: true, data: bill });
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.delete(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Bill deleted' } });
  });

  recordPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const payment = await service.recordPayment(ctx, req.params.id, req.body);
    res.status(201).json({ success: true, data: payment });
  });

  approve = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.approve(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Bill approved' } });
  });

  voidBill = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.voidBill(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Bill voided' } });
  });

  listPurchaseOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.listPurchaseOrders(ctx.tenantSchema, req.query);
    res.json({ success: true, ...result });
  });

  createPurchaseOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const po = await service.createPurchaseOrder(ctx, req.body);
    res.status(201).json({ success: true, data: po });
  });

  updatePurchaseOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const po = await service.updatePurchaseOrder(ctx, req.params.id, req.body);
    res.json({ success: true, data: po });
  });

  convertPOToBill = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const bill = await service.convertPOToBill(ctx, req.params.id);
    res.status(201).json({ success: true, data: bill });
  });
}
