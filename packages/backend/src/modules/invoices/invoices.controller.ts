import { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { asyncHandler } from '../../utils/async-handler';
import { AuthRequest } from '../../middleware/auth';
import { getServiceContext } from '../../types';

const service = new InvoicesService();

export class InvoicesController {
  list = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.list(ctx.tenantSchema, {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 25,
      status: req.query.status as string,
      customerId: req.query.customerId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      search: req.query.search as string,
    });
    res.json({ success: true, ...result });
  });

  getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const invoice = await service.getById(ctx.tenantSchema, req.params.id);
    res.json({ success: true, data: invoice });
  });

  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const invoice = await service.create(ctx, req.body);
    res.status(201).json({ success: true, data: invoice });
  });

  update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const invoice = await service.update(ctx, req.params.id, req.body);
    res.json({ success: true, data: invoice });
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.delete(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Invoice deleted' } });
  });

  send = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.sendInvoice(ctx, req.params.id, req.body);
    res.json({ success: true, data: { message: 'Invoice sent' } });
  });

  recordPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const payment = await service.recordPayment(ctx, req.body);
    res.status(201).json({ success: true, data: payment });
  });

  voidInvoice = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.voidInvoice(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Invoice voided' } });
  });

  duplicate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const invoice = await service.duplicate(ctx, req.params.id);
    res.status(201).json({ success: true, data: invoice });
  });

  createCreditMemo = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const creditMemo = await service.createCreditMemo(ctx, req.params.id, req.body);
    res.status(201).json({ success: true, data: creditMemo });
  });

  generatePdf = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const pdf = await service.generatePdf(ctx.tenantSchema, req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=invoice-${req.params.id}.pdf`);
    res.send(pdf);
  });

  listRecurringTemplates = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const templates = await service.listRecurringTemplates(ctx.tenantSchema);
    res.json({ success: true, data: templates });
  });

  createRecurringTemplate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const template = await service.createRecurringTemplate(ctx, req.body);
    res.status(201).json({ success: true, data: template });
  });

  updateRecurringTemplate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const template = await service.updateRecurringTemplate(ctx, req.params.id, req.body);
    res.json({ success: true, data: template });
  });

  deleteRecurringTemplate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.deleteRecurringTemplate(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Template deleted' } });
  });

  pauseRecurringTemplate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.toggleRecurringTemplate(ctx, req.params.id, true);
    res.json({ success: true, data: { message: 'Template paused' } });
  });

  resumeRecurringTemplate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.toggleRecurringTemplate(ctx, req.params.id, false);
    res.json({ success: true, data: { message: 'Template resumed' } });
  });
}
