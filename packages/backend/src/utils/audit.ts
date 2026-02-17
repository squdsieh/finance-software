import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

export interface AuditContext {
  userId: string;
  userName: string;
  ipAddress: string;
  tenantSchema: string;
}

export async function createAuditLog(
  db: Knex,
  context: AuditContext,
  action: 'create' | 'update' | 'delete',
  entityType: string,
  entityId: string,
  changes: Array<{ field: string; oldValue?: string; newValue?: string }>,
  metadata?: Record<string, unknown>,
) {
  await db.withSchema(context.tenantSchema).table('audit_logs').insert({
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    user_id: context.userId,
    user_name: context.userName,
    ip_address: context.ipAddress,
    action,
    entity_type: entityType,
    entity_id: entityId,
    changes: JSON.stringify(changes),
    metadata: metadata ? JSON.stringify(metadata) : '{}',
  });
}

export function getChanges(
  oldData: Record<string, any>,
  newData: Record<string, any>,
  fields: string[],
): Array<{ field: string; oldValue?: string; newValue?: string }> {
  const changes: Array<{ field: string; oldValue?: string; newValue?: string }> = [];

  for (const field of fields) {
    const oldVal = oldData[field];
    const newVal = newData[field];

    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({
        field,
        oldValue: oldVal != null ? String(oldVal) : undefined,
        newValue: newVal != null ? String(newVal) : undefined,
      });
    }
  }

  return changes;
}
