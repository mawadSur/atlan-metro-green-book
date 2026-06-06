-- ============================================================
-- Migration 0003: Claim requests + audit log for admin portal
-- ============================================================
-- Context: The admin portal needs:
--   1. claim_requests — users request ownership of locations; admins approve/reject
--   2. audit_log — tamper-proof audit trail of admin actions (inserts via service_role)
-- Prerequisites: public.is_admin() from 0002; profiles.role from 0002; auth.users.
-- Idempotent; safe to re-run.
-- ============================================================

-- ---------- 1. claim_requests table ----------
-- Users request to claim ownership of a location; admins review and decide.
CREATE TABLE IF NOT EXISTS claim_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_uid UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id   UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  note          TEXT DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at    TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE claim_requests ENABLE ROW LEVEL SECURITY;

-- RLS: requester can INSERT own + SELECT own
DROP POLICY IF EXISTS "claim_requests requester insert" ON claim_requests;
CREATE POLICY "claim_requests requester insert" ON claim_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_uid);

DROP POLICY IF EXISTS "claim_requests requester select" ON claim_requests;
CREATE POLICY "claim_requests requester select" ON claim_requests
  FOR SELECT USING (auth.uid() = requester_uid);

-- RLS: admin can SELECT/UPDATE all (uses is_admin() from 0002)
DROP POLICY IF EXISTS "claim_requests admin select" ON claim_requests;
CREATE POLICY "claim_requests admin select" ON claim_requests
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "claim_requests admin update" ON claim_requests;
CREATE POLICY "claim_requests admin update" ON claim_requests
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_claim_requests_status ON claim_requests(status);
CREATE INDEX IF NOT EXISTS idx_claim_requests_location_id ON claim_requests(location_id);
CREATE INDEX IF NOT EXISTS idx_claim_requests_requester_uid ON claim_requests(requester_uid);

COMMENT ON TABLE claim_requests IS 'Ownership claim requests. Users request; admins approve/reject. RLS: requester INSERT+SELECT own; admin SELECT+UPDATE all.';

-- ---------- 2. audit_log table ----------
-- Tamper-proof audit trail. Inserts happen via service_role (bypasses RLS).
-- Admins can SELECT; nobody can UPDATE/DELETE.
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_uid   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id   TEXT NOT NULL,
  detail      JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- RLS: admin SELECT only; inserts bypass RLS via service_role
DROP POLICY IF EXISTS "audit_log admin select" ON audit_log;
CREATE POLICY "audit_log admin select" ON audit_log
  FOR SELECT USING (public.is_admin());

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_uid ON audit_log(actor_uid);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON audit_log(target_type, target_id);

COMMENT ON TABLE audit_log IS 'Tamper-proof audit trail. Inserts via service_role only (bypasses RLS). Admin SELECT only. No UPDATE/DELETE policies.';
