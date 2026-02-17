import { Router } from 'express';
import { JournalEntriesController } from './journal-entries.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';

const controller = new JournalEntriesController();
export const journalEntriesRouter = Router();
journalEntriesRouter.use(authenticate);
journalEntriesRouter.use(requireTenant);

journalEntriesRouter.get('/', controller.list);
journalEntriesRouter.get('/:id', controller.getById);
journalEntriesRouter.post('/', authorize('journal:create'), controller.create);
journalEntriesRouter.put('/:id', authorize('journal:edit'), controller.update);
journalEntriesRouter.delete('/:id', authorize('journal:delete'), controller.delete);
journalEntriesRouter.post('/:id/post', authorize('journal:edit'), controller.post);
journalEntriesRouter.post('/:id/reverse', authorize('journal:create'), controller.reverse);
journalEntriesRouter.post('/:id/duplicate', authorize('journal:create'), controller.duplicate);
journalEntriesRouter.get('/recurring/list', controller.listRecurring);
journalEntriesRouter.post('/recurring', authorize('journal:create'), controller.createRecurring);
journalEntriesRouter.put('/recurring/:id', authorize('journal:edit'), controller.updateRecurring);
journalEntriesRouter.delete('/recurring/:id', authorize('journal:delete'), controller.deleteRecurring);
journalEntriesRouter.post('/recurring/:id/generate', authorize('journal:create'), controller.generateFromRecurring);
