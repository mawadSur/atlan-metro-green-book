-- ============================================================
-- Migration 0005: Email subscribers + rate-limited signup RPC
-- ============================================================
-- Context: the World Cup match/landing pages capture email signups (tourist
--   + local audiences) for launch comms. The list is write-only from the
--   public web: anon/authenticated may INSERT a signup but can NEVER read the
--   list back out (no SELECT policy), so the subscriber list cannot be scraped
--   via PostgREST. A SECURITY DEFINER RPC does the insert atomically and
--   enforces a per-IP rate limit (<=5 signups / hour) using a hashed-IP log.
--   The app passes an IP hash (never a raw IP) so we never store PII.
-- Idempotent; safe to re-run (create table if not exists, drop policy if
--   exists before create policy, create or replace function).
-- ============================================================

-- ---------- 1. subscribers (write-only from the public web) ----------
CREATE TABLE IF NOT EXISTS subscribers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  audience    TEXT NOT NULL DEFAULT 'visitor' CHECK (audience IN ('local', 'visitor')),
  consent     BOOLEAN NOT NULL DEFAULT true,
  utm_source  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

-- INSERT-only for anon + authenticated. There is deliberately NO SELECT /
-- UPDATE / DELETE policy for anon/authenticated, so the list cannot be read,
-- edited, or scraped back out through PostgREST. service_role bypasses RLS for
-- admin/export use.
DROP POLICY IF EXISTS "anon inserts subscriber" ON subscribers;
CREATE POLICY "anon inserts subscriber" ON subscribers
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated inserts subscriber" ON subscribers;
CREATE POLICY "authenticated inserts subscriber" ON subscribers
  FOR INSERT TO authenticated WITH CHECK (true);

-- ---------- 2. signups_log (hashed-IP rate-limit ledger) ----------
-- Stores only a hash of the requester IP (never a raw IP) + timestamp. Not
-- anon-readable: RLS is enabled with no anon/authenticated policy, and the
-- RPC writes it as SECURITY DEFINER.
CREATE TABLE IF NOT EXISTS signups_log (
  ip_hash     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE signups_log ENABLE ROW LEVEL SECURITY;
-- No policies -> anon/authenticated get no access; only the SECURITY DEFINER
-- RPC (running as the function owner) and service_role can touch this table.

CREATE INDEX IF NOT EXISTS signups_log_ip_hash_created_at_idx
  ON signups_log (ip_hash, created_at);

-- ---------- 3. subscribe_email() — atomic, rate-limited signup ----------
-- SECURITY DEFINER so it can write both tables despite their restrictive RLS.
-- search_path is pinned to public (SECURITY DEFINER hardening — prevents a
-- malicious caller from shadowing objects via a poisoned search_path).
-- Returns false (without inserting) when: the email shape is invalid, OR the
-- IP hash has already produced >=5 signups in the trailing hour.
CREATE OR REPLACE FUNCTION public.subscribe_email(
  p_email    TEXT,
  p_audience TEXT,
  p_utm      TEXT,
  p_ip_hash  TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_recent INTEGER;
BEGIN
  -- Basic email shape validation (defense in depth; the app validates too).
  IF p_email IS NULL OR p_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
    RETURN false;
  END IF;

  -- Per-IP rate limit: max 5 signups per trailing hour.
  IF p_ip_hash IS NOT NULL THEN
    SELECT count(*) INTO v_recent
    FROM public.signups_log
    WHERE ip_hash = p_ip_hash
      AND created_at > now() - interval '1 hour';

    IF v_recent >= 5 THEN
      RETURN false;
    END IF;
  END IF;

  -- Atomic: record the subscriber + the rate-limit ledger entry together.
  INSERT INTO public.subscribers (email, audience, consent, utm_source)
  VALUES (
    p_email,
    -- Normalize unknown audiences to the default rather than failing the check.
    CASE WHEN p_audience IN ('local', 'visitor') THEN p_audience ELSE 'visitor' END,
    true,
    p_utm
  );

  INSERT INTO public.signups_log (ip_hash)
  VALUES (p_ip_hash);

  RETURN true;
END;
$$;

-- The RPC is the ONLY public write path (PostgREST exposes it via /rpc).
GRANT EXECUTE ON FUNCTION public.subscribe_email(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

COMMENT ON TABLE subscribers IS 'Email signups (local/visitor). Write-only from anon/authenticated via RLS; no read policy so the list cannot be scraped. service_role bypasses RLS for export.';
COMMENT ON TABLE signups_log IS 'Hashed-IP + timestamp ledger for the subscribe rate limit. No raw IPs (no PII). Not anon-readable; written only by subscribe_email (SECURITY DEFINER).';
COMMENT ON FUNCTION public.subscribe_email(TEXT, TEXT, TEXT, TEXT) IS 'Atomic, rate-limited (<=5/hour/ip_hash) email signup. SECURITY DEFINER, search_path=public. Returns false on invalid email or rate-limit hit.';
