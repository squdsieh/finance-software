import { Router } from 'express';
import { TimeTrackingController } from './time-tracking.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';

const controller = new TimeTrackingController();
export const timeTrackingRouter = Router();
timeTrackingRouter.use(authenticate);
timeTrackingRouter.use(requireTenant);

// Time entries
timeTrackingRouter.get('/entries', controller.listEntries);
timeTrackingRouter.get('/entries/:id', controller.getEntry);
timeTrackingRouter.post('/entries', controller.createEntry);
timeTrackingRouter.put('/entries/:id', controller.updateEntry);
timeTrackingRouter.delete('/entries/:id', controller.deleteEntry);

// Timer
timeTrackingRouter.post('/timer/start', controller.startTimer);
timeTrackingRouter.post('/timer/stop', controller.stopTimer);
timeTrackingRouter.get('/timer/active', controller.getActiveTimer);

// Timesheets
timeTrackingRouter.get('/timesheets', controller.listTimesheets);
timeTrackingRouter.get('/timesheets/:id', controller.getTimesheet);
timeTrackingRouter.post('/timesheets', controller.createTimesheet);
timeTrackingRouter.post('/timesheets/:id/submit', controller.submitTimesheet);
timeTrackingRouter.post('/timesheets/:id/approve', authorize('timesheet:approve'), controller.approveTimesheet);
timeTrackingRouter.post('/timesheets/:id/reject', authorize('timesheet:approve'), controller.rejectTimesheet);

// Billable time
timeTrackingRouter.get('/billable', controller.listBillableTime);
timeTrackingRouter.post('/billable/create-invoice', authorize('invoices:create'), controller.createInvoiceFromTime);

// Reports
timeTrackingRouter.get('/reports/summary', controller.timeSummary);
timeTrackingRouter.get('/reports/by-project', controller.timeByProject);
timeTrackingRouter.get('/reports/by-employee', controller.timeByEmployee);
