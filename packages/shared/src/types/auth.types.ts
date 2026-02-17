export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  isMfaEnabled: boolean;
  mfaSecret?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantUser {
  id: string;
  userId: string;
  tenantId: string;
  roleId: string;
  isActive: boolean;
  invitedBy?: string;
  invitedAt?: string;
  joinedAt?: string;
}

export interface Role {
  id: string;
  tenantId?: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
}

export type PermissionModule =
  | 'customers' | 'vendors' | 'invoices' | 'bills' | 'expenses'
  | 'banking' | 'reports' | 'payroll' | 'inventory' | 'taxes'
  | 'settings' | 'users' | 'journal_entries' | 'budgets'
  | 'projects' | 'time_tracking' | 'estimates' | 'products';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export';

export interface Permission {
  id: string;
  module: PermissionModule;
  action: PermissionAction;
}

export type DefaultRole = 'owner' | 'admin' | 'accountant' | 'standard' | 'reports_only' | 'time_tracking_only';

export interface LoginRequest {
  email: string;
  password: string;
  mfaCode?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  tenant: { id: string; name: string };
  requiresMfa: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName: string;
  industry?: string;
}

export interface TokenPayload {
  userId: string;
  tenantId: string;
  roleId: string;
  permissions: string[];
  iat: number;
  exp: number;
}

export interface Session {
  id: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  isActive: boolean;
}
