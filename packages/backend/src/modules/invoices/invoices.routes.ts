import { Router } from 'express';
import { InvoicesController } from './invoices.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';
import { validate } from '../../middleware/validate';
import { createInvoiceSchema, recordPaymentSchema } from '@cloudbooks/shared';

const controller = new InvoicesController();
export const invoicesRouter = Router();

invoicesRouter.use(authenticate);
invoicesRouter.use(requireTenant);

invoicesRouter.get('/', controller.list);
invoicesRouter.get('/:id', controller.getById);
invoicesRouter.post('/', authorize('invoices:create'), validate(createInvoiceSchema), controller.create);
invoicesRouter.put('/:id', authorize('invoices:edit'), controller.update);
invoicesRouter.delete('/:id', authorize('invoices:delete'), controller.delete);
invoicesRouter.post('/:id/send', authorize('invoices:edit'), controller.send);
invoicesRouter.post('/:id/payment', authorize('invoices:edit'), validate(recordPaymentSchema), controller.recordPayment);
invoicesRouter.post('/:id/void', authorize('invoices:edit'), controller.voidInvoice);
invoicesRouter.post('/:id/duplicate', authorize('invoices:create'), controller.duplicate);
invoicesRouter.post('/:id/credit-memo', authorize('invoices:create'), controller.createCreditMemo);
invoicesRouter.get('/:id/pdf', controller.generatePdf);

// Recurring invoices
invoicesRouter.get('/recurring/templates', controller.listRecurringTemplates);
invoicesRouter.post('/recurring/templates', authorize('invoices:create'), controller.createRecurringTemplate);
invoicesRouter.put('/recurring/templates/:id', authorize('invoices:edit'), controller.updateRecurringTemplate);
invoicesRouter.delete('/recurring/templates/:id', authorize('invoices:delete'), controller.deleteRecurringTemplate);
invoicesRouter.post('/recurring/templates/:id/pause', authorize('invoices:edit'), controller.pauseRecurringTemplate);
invoicesRouter.post('/recurring/templates/:id/resume', authorize('invoices:edit'), controller.resumeRecurringTemplate);
