import { Router } from 'express';
import { PayrollController } from './payroll.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';

const controller = new PayrollController();
export const payrollRouter = Router();
payrollRouter.use(authenticate);
payrollRouter.use(requireTenant);

// Employees
payrollRouter.get('/employees', controller.listEmployees);
payrollRouter.get('/employees/:id', controller.getEmployee);
payrollRouter.post('/employees', authorize('payroll:create'), controller.createEmployee);
payrollRouter.put('/employees/:id', authorize('payroll:edit'), controller.updateEmployee);
payrollRouter.delete('/employees/:id', authorize('payroll:delete'), controller.deleteEmployee);
payrollRouter.put('/employees/:id/terminate', authorize('payroll:edit'), controller.terminateEmployee);

// Pay Runs
payrollRouter.get('/pay-runs', controller.listPayRuns);
payrollRouter.get('/pay-runs/:id', controller.getPayRun);
payrollRouter.post('/pay-runs', authorize('payroll:create'), controller.createPayRun);
payrollRouter.put('/pay-runs/:id', authorize('payroll:edit'), controller.updatePayRun);
payrollRouter.post('/pay-runs/:id/calculate', authorize('payroll:edit'), controller.calculatePayRun);
payrollRouter.post('/pay-runs/:id/approve', authorize('payroll:approve'), controller.approvePayRun);
payrollRouter.post('/pay-runs/:id/process', authorize('payroll:approve'), controller.processPayRun);
payrollRouter.get('/pay-runs/:id/payslips', controller.listPayslips);
payrollRouter.get('/pay-runs/:id/payslips/:employeeId', controller.getPayslip);

// Salary structures
payrollRouter.get('/salary-structures', controller.listSalaryStructures);
payrollRouter.post('/salary-structures', authorize('payroll:create'), controller.createSalaryStructure);
payrollRouter.put('/salary-structures/:id', authorize('payroll:edit'), controller.updateSalaryStructure);

// Deductions & Benefits
payrollRouter.get('/deduction-types', controller.listDeductionTypes);
payrollRouter.post('/deduction-types', authorize('payroll:create'), controller.createDeductionType);
payrollRouter.get('/benefit-types', controller.listBenefitTypes);
payrollRouter.post('/benefit-types', authorize('payroll:create'), controller.createBenefitType);

// Reports
payrollRouter.get('/reports/summary', controller.payrollSummary);
payrollRouter.get('/reports/tax-withholdings', controller.taxWithholdings);
