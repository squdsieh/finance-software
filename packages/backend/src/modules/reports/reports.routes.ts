import { Router } from 'express';
import { ReportsController } from './reports.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';

const controller = new ReportsController();
export const reportsRouter = Router();
reportsRouter.use(authenticate);
reportsRouter.use(requireTenant);

// Financial statements
reportsRouter.get('/profit-and-loss', controller.profitAndLoss);
reportsRouter.get('/balance-sheet', controller.balanceSheet);
reportsRouter.get('/cash-flow', controller.cashFlow);
reportsRouter.get('/trial-balance', controller.trialBalance);

// Receivables/Payables
reportsRouter.get('/ar-aging', controller.arAging);
reportsRouter.get('/ap-aging', controller.apAging);
reportsRouter.get('/ar-summary', controller.arSummary);
reportsRouter.get('/ap-summary', controller.apSummary);

// Other standard reports
reportsRouter.get('/general-ledger', controller.generalLedger);
reportsRouter.get('/journal', controller.journalReport);
reportsRouter.get('/income-by-customer', controller.incomeByCustomer);
reportsRouter.get('/expenses-by-vendor', controller.expensesByVendor);
reportsRouter.get('/tax-summary', controller.taxSummary);
reportsRouter.get('/sales-by-product', controller.salesByProduct);

// Custom reports
reportsRouter.get('/custom', controller.listCustomReports);
reportsRouter.post('/custom', authorize('reports:create'), controller.createCustomReport);
reportsRouter.get('/custom/:id', controller.runCustomReport);
reportsRouter.put('/custom/:id', authorize('reports:edit'), controller.updateCustomReport);
reportsRouter.delete('/custom/:id', authorize('reports:delete'), controller.deleteCustomReport);

// Export
reportsRouter.post('/export', controller.exportReport);
