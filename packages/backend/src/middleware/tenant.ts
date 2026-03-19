import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { AppError } from '../utils/app-error';

export function requireTenant(req: AuthRequest, _res: Response, next: NextFunction) {
  if (!req.user?.tenantId || !req.tenantSchema) {
    throw new AppError('Tenant context required', 400, 'TENANT_REQUIRED');
  }
  next();
}
