import { Response } from 'express';
import { InventoryService } from './inventory.service';
import { asyncHandler } from '../../utils/async-handler';
import { AuthRequest } from '../../middleware/auth';
import { getServiceContext } from '../../types';

const service = new InventoryService();

export class InventoryController {
  listItems = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.listItems(ctx.tenantSchema, req.query);
    res.json({ success: true, ...result });
  });

  getItem = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const item = await service.getItem(ctx.tenantSchema, req.params.id);
    res.json({ success: true, data: item });
  });

  createItem = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const item = await service.createItem(ctx, req.body);
    res.status(201).json({ success: true, data: item });
  });

  updateItem = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const item = await service.updateItem(ctx, req.params.id, req.body);
    res.json({ success: true, data: item });
  });

  deleteItem = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.deleteItem(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Item deleted' } });
  });

  getStockLevels = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const stock = await service.getStockLevels(ctx.tenantSchema, req.query);
    res.json({ success: true, data: stock });
  });

  getItemStock = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const stock = await service.getItemStock(ctx.tenantSchema, req.params.itemId);
    res.json({ success: true, data: stock });
  });

  getLowStockAlerts = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const alerts = await service.getLowStockAlerts(ctx.tenantSchema);
    res.json({ success: true, data: alerts });
  });

  listAdjustments = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.listAdjustments(ctx.tenantSchema, req.query);
    res.json({ success: true, ...result });
  });

  createAdjustment = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const adjustment = await service.createAdjustment(ctx, req.body);
    res.status(201).json({ success: true, data: adjustment });
  });

  getAdjustment = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const adjustment = await service.getAdjustment(ctx.tenantSchema, req.params.id);
    res.json({ success: true, data: adjustment });
  });

  listTransfers = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.listTransfers(ctx.tenantSchema, req.query);
    res.json({ success: true, data: result });
  });

  createTransfer = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const transfer = await service.createTransfer(ctx, req.body);
    res.status(201).json({ success: true, data: transfer });
  });

  receiveTransfer = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.receiveTransfer(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Transfer received' } });
  });

  listLocations = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const locations = await service.listLocations(ctx.tenantSchema);
    res.json({ success: true, data: locations });
  });

  createLocation = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const location = await service.createLocation(ctx, req.body);
    res.status(201).json({ success: true, data: location });
  });

  updateLocation = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const location = await service.updateLocation(ctx, req.params.id, req.body);
    res.json({ success: true, data: location });
  });

  listAssemblies = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const assemblies = await service.listAssemblies(ctx.tenantSchema);
    res.json({ success: true, data: assemblies });
  });

  createAssembly = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const assembly = await service.createAssembly(ctx, req.body);
    res.status(201).json({ success: true, data: assembly });
  });

  buildAssembly = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.buildAssembly(ctx, req.params.id, req.body);
    res.json({ success: true, data: result });
  });

  valuationReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const report = await service.valuationReport(ctx.tenantSchema, req.query);
    res.json({ success: true, data: report });
  });

  movementReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const report = await service.movementReport(ctx.tenantSchema, req.query);
    res.json({ success: true, data: report });
  });
}
