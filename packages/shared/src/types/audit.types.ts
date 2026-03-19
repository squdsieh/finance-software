export interface AuditLog {
  id: string;
  tenantId: string;
  timestamp: string;
  userId: string;
  userName: string;
  ipAddress: string;
  action: 'create' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  changes: AuditChange[];
  metadata?: Record<string, unknown>;
}

export interface AuditChange {
  field: string;
  oldValue?: string;
  newValue?: string;
}

export interface ClosingDateConfig {
  closingDate: string;
  password: string;
  setBy: string;
  setAt: string;
}
