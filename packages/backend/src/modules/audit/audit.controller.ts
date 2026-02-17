import { Response } from 'express';
import { AuditService } from './audit.service';
import { asyncHandler } from '../../utils/async-handler';
import { AuthRequest } from '../../middleware/auth';
import { getServiceContext } from '../../types';

const service = new AuditService();

export class AuditController {
  listLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.listLogs(ctx.tenantSchema, req.query);
    res.json({ success: true, ...result });
  });

  getLog = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const log = await service.getLog(ctx.tenantSchema, req.params.id);
    res.json({ success: true, data: log });
  });

  getEntityHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const history = await service.getEntityHistory(ctx.tenantSchema, req.params.entityType, req.params.entityId);
    res.json({ success: true, data: history });
  });

  listPeriods = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const periods = await service.listPeriods(ctx.tenantSchema);
    res.json({ success: true, data: periods });
  });

  createPeriod = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const period = await service.createPeriod(ctx, req.body);
    res.status(201).json({ success: true, data: period });
  });

  lockPeriod = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.lockPeriod(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Period locked' } });
  });

  unlockPeriod = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.unlockPeriod(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Period unlocked' } });
  });

  yearEndClose = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.yearEndClose(ctx, req.body);
    res.json({ success: true, data: result });
  });

  yearEndStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const status = await service.yearEndStatus(ctx.tenantSchema, req.query);
    res.json({ success: true, data: status });
  });

  exportAuditTrail = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const data = await service.exportAuditTrail(ctx.tenantSchema, req.query);
    res.json({ success: true, data });
  });

  exportFTAReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const data = await service.exportFTAReport(ctx.tenantSchema, req.query);
    res.json({ success: true, data });
  });

  exportChartOfAccounts = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const data = await service.exportChartOfAccounts(ctx.tenantSchema);
    res.json({ success: true, data });
  });
}
