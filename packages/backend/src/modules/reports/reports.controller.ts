import { Response } from 'express';
import { ReportsService } from './reports.service';
import { asyncHandler } from '../../utils/async-handler';
import { AuthRequest } from '../../middleware/auth';
import { getServiceContext } from '../../types';

const service = new ReportsService();

export class ReportsController {
  profitAndLoss = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const report = await service.profitAndLoss(ctx.tenantSchema, req.query);
    res.json({ success: true, data: report });
  });

  balanceSheet = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const report = await service.balanceSheet(ctx.tenantSchema, req.query);
    res.json({ success: true, data: report });
  });

  cashFlow = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const report = await service.cashFlow(ctx.tenantSchema, req.query);
    res.json({ success: true, data: report });
  });

  trialBalance = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const report = await service.trialBalance(ctx.tenantSchema, req.query);
    res.json({ success: true, data: report });
  });

  arAging = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const report = await service.arAging(ctx.tenantSchema, req.query);
    res.json({ success: true, data: report });
  });

  apAging = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const report = await service.apAging(ctx.tenantSchema, req.query);
    res.json({ success: true, data: report });
  });

  arSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const report = await service.arSummary(ctx.tenantSchema, req.query);
    res.json({ success: true, data: report });
  });

  apSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const report = await service.apSummary(ctx.tenantSchema, req.query);
    res.json({ success: true, data: report });
  });

  generalLedger = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const report = await service.generalLedger(ctx.tenantSchema, req.query);
    res.json({ success: true, data: report });
  });

  journalReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const report = await service.journalReport(ctx.tenantSchema, req.query);
    res.json({ success: true, data: report });
  });

  incomeByCustomer = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const report = await service.incomeByCustomer(ctx.tenantSchema, req.query);
    res.json({ success: true, data: report });
  });

  expensesByVendor = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const report = await service.expensesByVendor(ctx.tenantSchema, req.query);
    res.json({ success: true, data: report });
  });

  taxSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const report = await service.taxSummary(ctx.tenantSchema, req.query);
    res.json({ success: true, data: report });
  });

  salesByProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const report = await service.salesByProduct(ctx.tenantSchema, req.query);
    res.json({ success: true, data: report });
  });

  listCustomReports = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const reports = await service.listCustomReports(ctx.tenantSchema);
    res.json({ success: true, data: reports });
  });

  createCustomReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const report = await service.createCustomReport(ctx, req.body);
    res.status(201).json({ success: true, data: report });
  });

  runCustomReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const report = await service.runCustomReport(ctx.tenantSchema, req.params.id, req.query);
    res.json({ success: true, data: report });
  });

  updateCustomReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const report = await service.updateCustomReport(ctx, req.params.id, req.body);
    res.json({ success: true, data: report });
  });

  deleteCustomReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.deleteCustomReport(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Custom report deleted' } });
  });

  exportReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.exportReport(ctx.tenantSchema, req.body);
    res.json({ success: true, data: result });
  });
}
