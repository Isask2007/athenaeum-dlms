import { json, run, now } from '../db/index.js';

export function logAction(actorId, action, targetType = '', targetId = null, detail = {}) {
  run(
    'INSERT INTO audit_logs (actor_id, action, target_type, target_id, detail, created_at) VALUES (?,?,?,?,?,?)',
    [actorId ?? null, action, targetType, targetId ?? null, json(detail), now()],
  );
}
