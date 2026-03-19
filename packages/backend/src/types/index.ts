import { Request } from 'express';
import { TokenPayload } from '@cloudbooks/shared';

export interface AuthRequest extends Request {
  user?: TokenPayload;
  tenantSchema?: string;
}

export interface ServiceContext {
  userId: string;
  userName: string;
  tenantId: string;
  tenantSchema: string;
  ipAddress: string;
  permissions: string[];
}

export function getServiceContext(req: AuthRequest): ServiceContext {
  if (!req.user) {
    throw new Error('User not authenticated');
  }

  return {
    userId: req.user.userId,
    userName: `${req.user.userId}`,
    tenantId: req.user.tenantId,
    tenantSchema: req.tenantSchema || `tenant_${req.user.tenantId.replace(/-/g, '_')}`,
    ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
    permissions: req.user.permissions || [],
  };
}
