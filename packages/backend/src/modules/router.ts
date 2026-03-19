import { Router } from 'express';
import { authRouter } from './auth/auth.routes';
import { companyRouter } from './company/company.routes';
import { accountsRouter } from './accounts/accounts.routes';
import { customersRouter } from './customers/customers.routes';
import { vendorsRouter } from './vendors/vendors.routes';
import { productsRouter } from './products/products.routes';
import { invoicesRouter } from './invoices/invoices.routes';
import { estimatesRouter } from './estimates/estimates.routes';
import { billsRouter } from './bills/bills.routes';
import { expensesRouter } from './expenses/expenses.routes';
import { bankingRouter } from './banking/banking.routes';
import { journalEntriesRouter } from './journal-entries/journal-entries.routes';
import { payrollRouter } from './payroll/payroll.routes';
import { timeTrackingRouter } from './time-tracking/time-tracking.routes';
import { projectsRouter } from './projects/projects.routes';
import { inventoryRouter } from './inventory/inventory.routes';
import { taxRouter } from './tax/tax.routes';
import { reportsRouter } from './reports/reports.routes';
import { budgetsRouter } from './budgets/budgets.routes';
import { currencyRouter } from './currency/currency.routes';
import { auditRouter } from './audit/audit.routes';
import { notificationsRouter } from './notifications/notifications.routes';
import { integrationsRouter } from './integrations/integrations.routes';
import { subscriptionsRouter } from './subscriptions/subscriptions.routes';

export const apiRouter = Router();

// Public routes
apiRouter.use('/auth', authRouter);

// Protected routes (all require authentication via their own middleware)
apiRouter.use('/company', companyRouter);
apiRouter.use('/accounts', accountsRouter);
apiRouter.use('/customers', customersRouter);
apiRouter.use('/vendors', vendorsRouter);
apiRouter.use('/products', productsRouter);
apiRouter.use('/invoices', invoicesRouter);
apiRouter.use('/estimates', estimatesRouter);
apiRouter.use('/bills', billsRouter);
apiRouter.use('/expenses', expensesRouter);
apiRouter.use('/banking', bankingRouter);
apiRouter.use('/journal-entries', journalEntriesRouter);
apiRouter.use('/payroll', payrollRouter);
apiRouter.use('/time-tracking', timeTrackingRouter);
apiRouter.use('/projects', projectsRouter);
apiRouter.use('/inventory', inventoryRouter);
apiRouter.use('/tax', taxRouter);
apiRouter.use('/reports', reportsRouter);
apiRouter.use('/budgets', budgetsRouter);
apiRouter.use('/currencies', currencyRouter);
apiRouter.use('/audit', auditRouter);
apiRouter.use('/notifications', notificationsRouter);
apiRouter.use('/integrations', integrationsRouter);
apiRouter.use('/subscriptions', subscriptionsRouter);
