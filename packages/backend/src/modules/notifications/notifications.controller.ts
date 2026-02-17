import { Response } from 'express';
import { NotificationsService } from './notifications.service';
import { asyncHandler } from '../../utils/async-handler';
import { AuthRequest } from '../../middleware/auth';
import { getServiceContext } from '../../types';

const service = new NotificationsService();

export class NotificationsController {
  list = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const result = await service.list(ctx.tenantSchema, ctx.userId, req.query);
    res.json({ success: true, ...result });
  });

  getUnreadCount = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const count = await service.getUnreadCount(ctx.tenantSchema, ctx.userId);
    res.json({ success: true, data: { count } });
  });

  getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const notification = await service.getById(ctx.tenantSchema, req.params.id, ctx.userId);
    res.json({ success: true, data: notification });
  });

  markRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.markRead(ctx.tenantSchema, req.params.id, ctx.userId);
    res.json({ success: true, data: { message: 'Notification marked as read' } });
  });

  markAllRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const count = await service.markAllRead(ctx.tenantSchema, ctx.userId);
    res.json({ success: true, data: { message: `${count} notifications marked as read` } });
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.delete(ctx.tenantSchema, req.params.id, ctx.userId);
    res.json({ success: true, data: { message: 'Notification deleted' } });
  });

  deleteAll = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.deleteAll(ctx.tenantSchema, ctx.userId);
    res.json({ success: true, data: { message: 'All notifications deleted' } });
  });

  getPreferences = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    const preferences = await service.getPreferences(ctx.tenantSchema, ctx.userId);
    res.json({ success: true, data: preferences });
  });

  updatePreferences = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = getServiceContext(req);
    await service.updatePreferences(ctx.tenantSchema, ctx.userId, req.body);
    res.json({ success: true, data: { message: 'Preferences updated' } });
  });
}
