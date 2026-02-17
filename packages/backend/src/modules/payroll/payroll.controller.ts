import { Response } from 'express';
import { PayrollService } from './payroll.service';
import { asyncHandler } from '../../utils/async-handler';
import { AuthRequest } from '../../middleware/auth';
import { getServiceContext } from '../../types';

const service = new PayrollService();

export class PayrollController {
  listEmployees = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.listEmployees(ctx.tenantSchema, req.query);
    res.json({ success: true, ...result });
  });

  getEmployee = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const employee = await service.getEmployee(ctx.tenantSchema, req.params.id);
    res.json({ success: true, data: employee });
  });

  createEmployee = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const employee = await service.createEmployee(ctx, req.body);
    res.status(201).json({ success: true, data: employee });
  });

  updateEmployee = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const employee = await service.updateEmployee(ctx, req.params.id, req.body);
    res.json({ success: true, data: employee });
  });

  deleteEmployee = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.deleteEmployee(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Employee deleted' } });
  });

  terminateEmployee = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.terminateEmployee(ctx, req.params.id, req.body);
    res.json({ success: true, data: { message: 'Employee terminated' } });
  });

  listPayRuns = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.listPayRuns(ctx.tenantSchema, req.query);
    res.json({ success: true, ...result });
  });

  getPayRun = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const payRun = await service.getPayRun(ctx.tenantSchema, req.params.id);
    res.json({ success: true, data: payRun });
  });

  createPayRun = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const payRun = await service.createPayRun(ctx, req.body);
    res.status(201).json({ success: true, data: payRun });
  });

  updatePayRun = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const payRun = await service.updatePayRun(ctx, req.params.id, req.body);
    res.json({ success: true, data: payRun });
  });

  calculatePayRun = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.calculatePayRun(ctx, req.params.id);
    res.json({ success: true, data: result });
  });

  approvePayRun = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.approvePayRun(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Pay run approved' } });
  });

  processPayRun = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.processPayRun(ctx, req.params.id);
    res.json({ success: true, data: { message: 'Pay run processed' } });
  });

  listPayslips = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const payslips = await service.listPayslips(ctx.tenantSchema, req.params.id);
    res.json({ success: true, data: payslips });
  });

  getPayslip = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const payslip = await service.getPayslip(ctx.tenantSchema, req.params.id, req.params.employeeId);
    res.json({ success: true, data: payslip });
  });

  listSalaryStructures = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const structures = await service.listSalaryStructures(ctx.tenantSchema);
    res.json({ success: true, data: structures });
  });

  createSalaryStructure = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const structure = await service.createSalaryStructure(ctx, req.body);
    res.status(201).json({ success: true, data: structure });
  });

  updateSalaryStructure = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const structure = await service.updateSalaryStructure(ctx, req.params.id, req.body);
    res.json({ success: true, data: structure });
  });

  listDeductionTypes = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const types = await service.listDeductionTypes(ctx.tenantSchema);
    res.json({ success: true, data: types });
  });

  createDeductionType = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const type = await service.createDeductionType(ctx, req.body);
    res.status(201).json({ success: true, data: type });
  });

  listBenefitTypes = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const types = await service.listBenefitTypes(ctx.tenantSchema);
    res.json({ success: true, data: types });
  });

  createBenefitType = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const type = await service.createBenefitType(ctx, req.body);
    res.status(201).json({ success: true, data: type });
  });

  payrollSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const summary = await service.payrollSummary(ctx.tenantSchema, req.query);
    res.json({ success: true, data: summary });
  });

  taxWithholdings = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const report = await service.taxWithholdings(ctx.tenantSchema, req.query);
    res.json({ success: true, data: report });
  });
}
