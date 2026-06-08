-- ============================================================
-- Migration 0003: Claim requests + audit log + business admin override
-- ============================================================
-- Builds on 0002 (profiles, public.is_admin(), locations column protection).
-- Implements the admin/business portal moderation + audit surfaces (design:
-- docs/designs/admin-business-portals.md, D2 self-claim-with-approval).
--
-- !! HUMAN-APPLIED MIGRATION !!
-- Per the design's mandatory gate, this migration MUST be applied to prod by a
-- HUMAN via the Supabase Management API AFTER a security review (privilege
-- escalation / service_role leak / IDOR). It must NOT be applied to prod by an
-- agent. It is idempotent (CREATE TABLE IF NOT EXISTS / DROP POLICY IF EXISTS
-- before CREATE POLICY) and safe to re-run.
--
-- Security model recap (from 0002):
--   * public.is_admin() is SECURITY DEFINER; true iff auth.uid() has role=admin.
--   * service_role bypasses RLS entirely (server actions use it for writes).
--   * NEVER add an is_admin() policy to `profiles` (recursion landmine — 0002).
-- ============================================================

-- ---------- 1. claim_requests (business self-claim moderation queue) ----------
CREATE TABLE IF NOT EXISTS claim_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_uid UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id   UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_by    UUID REFERENCES auth.users(id),
  decided_at    TIMESTAMPTZ
);

ALTER TABLE claim_requests ENABLE ROW LEVEL SECURITY;

-- A user may create a claim ONLY for themselves (cannot forge requester_uid).
DROP POLICY IF EXISTS "claim insert own" ON claim_requests;
CREATE POLICY "claim insert own" ON claim_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_uid);

-- A user sees their OWN claims; an admin sees all (moderation queue).
DROP POLICY IF EXISTS "claim select own or admin" ON claim_requests;
CREATE POLICY "claim select own or admin" ON claim_requests
  FOR SELECT USING (auth.uid() = requester_uid OR public.is_admin());

-- Only an admin may approve/reject (decide) a claim.
DROP POLICY IF EXISTS "claim admin update" ON claim_requests;
CREATE POLICY "claim admin update" ON claim_requests
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Grants: anon gets nothing; authenticated gets table-level SELECT/INSERT/UPDATE
-- and RLS gates WHICH rows (own for users, all for admins). No DELETE — claims
-- are an audit trail; resolution is via status, not deletion.
REVOKE ALL ON claim_requests FROM anon;
GRANT SELECT, INSERT, UPDATE ON claim_requests TO authenticated;

CREATE INDEX IF NOT EXISTS claim_requests_status_idx
  ON claim_requests (status);
CREATE INDEX IF NOT EXISTS claim_requests_requester_idx
  ON claim_requests (requester_uid);

COMMENT ON TABLE claim_requests IS
  'Business self-claim moderation queue. Requester inserts/sees own; admin sees/decides all (status pending|approved|rejected). RLS-gated.';

-- ---------- 2. audit_log (append-only, admin-readable) ----------
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_uid   UUID,
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   TEXT,
  detail      JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
-- FORCE so even the table owner is subject to RLS; only service_role (which
-- bypasses RLS) can write. This makes the log effectively append-only from any
-- JWT-scoped client.
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;

-- Admin-read only. There is NO insert/update/delete policy: writes happen
-- exclusively via service_role (server actions + admin mutations), which
-- bypasses RLS. A non-bypassing role can never write or mutate the log.
DROP POLICY IF EXISTS "audit admin read" ON audit_log;
CREATE POLICY "audit admin read" ON audit_log
  FOR SELECT USING (public.is_admin());

-- Grants: no write privileges to JWT-scoped roles at all; only SELECT, and RLS
-- narrows readable rows to admins. service_role writes (bypasses both).
REVOKE INSERT, UPDATE, DELETE ON audit_log FROM anon, authenticated;
GRANT SELECT ON audit_log TO authenticated;

CREATE INDEX IF NOT EXISTS audit_log_created_at_idx
  ON audit_log (created_at DESC);

COMMENT ON TABLE audit_log IS
  'Append-only audit trail of admin/server mutations. Admin-read via RLS; written only by service_role (RLS-bypassing). FORCE ROW LEVEL SECURITY enabled.';

-- ---------- 3. businesses admin override ----------
-- Lets admins manage (read/insert/update/delete) ANY business row, alongside
-- the existing owner-manage policy ("owner manages business", USING auth.uid()=uid).
DROP POLICY IF EXISTS "admin manages business" ON businesses;
CREATE POLICY "admin manages business" ON businesses
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------- NOTE: profiles intentionally untouched ----------
-- Per 0002, NO is_admin() policy is added to `profiles` (it would recurse, since
-- is_admin() itself reads profiles). Admins read all profiles via service_role.
