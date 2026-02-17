import { Response } from 'express';
import { TimeTrackingService } from './time-tracking.service';
import { asyncHandler } from '../../utils/async-handler';
import { AuthRequest } from '../../middleware/auth';
import { getServiceContext } from '../../types';

const service = new TimeTrackingService();

export class TimeTrackingController {
  listEntries = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.listEntries(ctx.tenantSchema, req.query);
    res.json({ success: true, ...result });
  });

  getEntry = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const entry = await service.getEntry(ctx.tenantSchema, req.params.id);
    res.json({ success: true, data: entry });
  });

  createEntry = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const entry = await service.createEntry(ctx, req.body);
    res.status(201).json({ success: true, data: entry });
  });

  updateEntry = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const entry = await service.updateEntry(ctx, req.params.id, req.body);
    res.json({ success: true, data: entry });
  });

  deleteEntry = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.deleteEntry(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Time entry deleted' } });
  });

  startTimer = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const timer = await service.startTimer(ctx, req.body);
    res.status(201).json({ success: true, data: timer });
  });

  stopTimer = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const entry = await service.stopTimer(ctx);
    res.json({ success: true, data: entry });
  });

  getActiveTimer = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const timer = await service.getActiveTimer(ctx);
    res.json({ success: true, data: timer });
  });

  listTimesheets = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.listTimesheets(ctx.tenantSchema, req.query);
    res.json({ success: true, ...result });
  });

  getTimesheet = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const timesheet = await service.getTimesheet(ctx.tenantSchema, req.params.id);
    res.json({ success: true, data: timesheet });
  });

  createTimesheet = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const timesheet = await service.createTimesheet(ctx, req.body);
    res.status(201).json({ success: true, data: timesheet });
  });

  submitTimesheet = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.submitTimesheet(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Timesheet submitted for approval' } });
  });

  approveTimesheet = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.approveTimesheet(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Timesheet approved' } });
  });

  rejectTimesheet = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.rejectTimesheet(ctx, req.params.id, req.body);
    res.json({ success: true, data: { message: 'Timesheet rejected' } });
  });

  listBillableTime = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.listBillableTime(ctx.tenantSchema, req.query);
    res.json({ success: true, data: result });
  });

  createInvoiceFromTime = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const invoice = await service.createInvoiceFromTime(ctx, req.body);
    res.status(201).json({ success: true, data: invoice });
  });

  timeSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const summary = await service.timeSummary(ctx.tenantSchema, req.query);
    res.json({ success: true, data: summary });
  });

  timeByProject = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const report = await service.timeByProject(ctx.tenantSchema, req.query);
    res.json({ success: true, data: report });
  });

  timeByEmployee = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const report = await service.timeByEmployee(ctx.tenantSchema, req.query);
    res.json({ success: true, data: report });
  });
}
