import type { Request } from 'express';
import { prisma } from './db';

export type AuditAction = 'view' | 'create' | 'update' | 'delete' | 'amend' | 'export' | 'login' | 'denied';

/** Records who did what to which record; no clinical content is stored (FR-031). */
export async function audit(
  req: Request,
  action: AuditAction,
  entity: string,
  entityId: string | null = null,
  outcome: 'ok' | 'denied' | 'error' = 'ok',
): Promise<void> {
  await prisma.auditLog.create({
    data: { actorId: req.user?.id ?? null, action, entity, entityId, outcome },
  });
}
