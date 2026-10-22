import type { Tx } from '../db';

/**
 * Append an audit entry. `meta` must never contain clinical free text (feedback, notes) —
 * only identifiers and field names.
 */
export async function audit(
  tx: Tx,
  actorId: string | null,
  practiceId: string | null,
  action: string,
  entity: string,
  entityId: string | null,
  meta: Record<string, unknown> = {},
) {
  await tx.query(
    'INSERT INTO audit_log(actor_id, practice_id, action, entity, entity_id, meta) VALUES ($1,$2,$3,$4,$5,$6)',
    [actorId, practiceId, action, entity, entityId, meta],
  );
}
