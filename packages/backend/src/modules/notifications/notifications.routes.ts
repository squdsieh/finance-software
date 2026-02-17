import { Router } from 'express';
import { NotificationsController } from './notifications.controller';
import { authenticate } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';

const controller = new NotificationsController();
export const notificationsRouter = Router();
notificationsRouter.use(authenticate);
notificationsRouter.use(requireTenant);

notificationsRouter.get('/', controller.list);
notificationsRouter.get('/unread-count', controller.getUnreadCount);
notificationsRouter.get('/:id', controller.getById);
notificationsRouter.put('/:id/read', controller.markRead);
notificationsRouter.put('/read-all', controller.markAllRead);
notificationsRouter.delete('/:id', controller.delete);
notificationsRouter.delete('/', controller.deleteAll);

// Notification preferences
notificationsRouter.get('/preferences', controller.getPreferences);
notificationsRouter.put('/preferences', controller.updatePreferences);
