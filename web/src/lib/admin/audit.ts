// SERVER-ONLY audit log writer.
//
// Writes are performed with the service-role client, which bypasses RLS. The
// audit_log table has FORCE ROW LEVEL SECURITY and NO insert policy, so only a
// RLS-bypassing role can append to it — making the log append-only from any
// JWT-scoped client. No 'use server' directive (plain helper, sync-shaped export).
import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

export interface AuditEntry {
  /** Verified uid of the admin performing the action. */
  actorUid: string;
  /** Machine-readable action name, e.g. 'location.verify_halal'. */
  action: string;
  /** The kind of entity affected, e.g. 'location' | 'claim' | 'user'. */
  targetType: string;
  /** The id of the affected entity. */
  targetId: string;
  /** Optional structured context (stored as JSONB). */
  detail?: Record<string, unknown>;
}

/**
 * Append a row to audit_log via the service client.
 *
 * Audit writes are best-effort with respect to the caller: a logging failure
 * throws so the caller can surface it, but callers perform the audit write AFTER
 * the mutation succeeds, so the source-of-truth change is never lost to a log
 * hiccup.
 */
export async function writeAudit(
  service: SupabaseClient,
  entry: AuditEntry
): Promise<void> {
  const { error } = await service.from('audit_log').insert({
    actor_uid: entry.actorUid,
    action: entry.action,
    target_type: entry.targetType,
    target_id: entry.targetId,
    detail: entry.detail ?? null,
  });
  if (error) {
    throw new Error(`[admin] Failed to write audit log: ${error.message}`);
  }
}
