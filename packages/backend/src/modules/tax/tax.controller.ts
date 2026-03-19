import { Response } from 'express';
import { TaxService } from './tax.service';
import { asyncHandler } from '../../utils/async-handler';
import { AuthRequest } from '../../middleware/auth';
import { getServiceContext } from '../../types';

const service = new TaxService();

export class TaxController {
  listRates = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const rates = await service.listRates(ctx.tenantSchema);
    res.json({ success: true, data: rates });
  });

  getRate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const rate = await service.getRate(ctx.tenantSchema, req.params.id);
    res.json({ success: true, data: rate });
  });

  createRate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const rate = await service.createRate(ctx, req.body);
    res.status(201).json({ success: true, data: rate });
  });

  updateRate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const rate = await service.updateRate(ctx, req.params.id, req.body);
    res.json({ success: true, data: rate });
  });

  deleteRate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.deleteRate(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Tax rate deleted' } });
  });

  listGroups = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const groups = await service.listGroups(ctx.tenantSchema);
    res.json({ success: true, data: groups });
  });

  createGroup = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const group = await service.createGroup(ctx, req.body);
    res.status(201).json({ success: true, data: group });
  });

  updateGroup = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const group = await service.updateGroup(ctx, req.params.id, req.body);
    res.json({ success: true, data: group });
  });

  deleteGroup = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.deleteGroup(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Tax group deleted' } });
  });

  listReturns = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const returns = await service.listReturns(ctx.tenantSchema, req.query);
    res.json({ success: true, data: returns });
  });

  getReturn = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const taxReturn = await service.getReturn(ctx.tenantSchema, req.params.id);
    res.json({ success: true, data: taxReturn });
  });

  createReturn = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const taxReturn = await service.createReturn(ctx, req.body);
    res.status(201).json({ success: true, data: taxReturn });
  });

  updateReturn = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const taxReturn = await service.updateReturn(ctx, req.params.id, req.body);
    res.json({ success: true, data: taxReturn });
  });

  submitReturn = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.submitReturn(ctx, req.params.id);
    res.json({ success: true, data: { message: 'VAT return submitted' } });
  });

  fileReturn = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.fileReturn(ctx, req.params.id);
    res.json({ success: true, data: { message: 'VAT return filed with FTA' } });
  });

  validateTRN = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.validateTRN(ctx.tenantSchema, req.query.trn as string);
    res.json({ success: true, data: result });
  });

  exportForFTA = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const data = await service.exportForFTA(ctx.tenantSchema, req.params.returnId);
    res.json({ success: true, data });
  });

  taxLiabilityReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const report = await service.taxLiabilityReport(ctx.tenantSchema, req.query);
    res.json({ success: true, data: report });
  });

  taxCollectedReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const report = await service.taxCollectedReport(ctx.tenantSchema, req.query);
    res.json({ success: true, data: report });
  });

  taxPaidReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const report = await service.taxPaidReport(ctx.tenantSchema, req.query);
    res.json({ success: true, data: report });
  });

  getSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const settings = await service.getSettings(ctx.tenantSchema);
    res.json({ success: true, data: settings });
  });

  updateSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.updateSettings(ctx, req.body);
    res.json({ success: true, data: { message: 'Tax settings updated' } });
  });
}
