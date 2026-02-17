import { Router } from 'express';
import { AuditController } from './audit.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';

const controller = new AuditController();
export const auditRouter = Router();
auditRouter.use(authenticate);
auditRouter.use(requireTenant);

// Audit log (read-only)
auditRouter.get('/logs', authorize('audit:view'), controller.listLogs);
auditRouter.get('/logs/:id', authorize('audit:view'), controller.getLog);
auditRouter.get('/logs/entity/:entityType/:entityId', authorize('audit:view'), controller.getEntityHistory);

// Period locking (closing the books)
auditRouter.get('/periods', controller.listPeriods);
auditRouter.post('/periods', authorize('audit:lock'), controller.createPeriod);
auditRouter.post('/periods/:id/lock', authorize('audit:lock'), controller.lockPeriod);
auditRouter.post('/periods/:id/unlock', authorize('audit:lock'), controller.unlockPeriod);

// Year-end close
auditRouter.post('/year-end-close', authorize('audit:lock'), controller.yearEndClose);
auditRouter.get('/year-end-close/status', controller.yearEndStatus);

// Compliance exports
auditRouter.get('/export/audit-trail', authorize('audit:view'), controller.exportAuditTrail);
auditRouter.get('/export/fta-report', authorize('audit:view'), controller.exportFTAReport);
auditRouter.get('/export/chart-of-accounts', authorize('audit:view'), controller.exportChartOfAccounts);
