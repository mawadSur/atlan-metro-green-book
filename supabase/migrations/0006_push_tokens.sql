-- ============================================================
-- Migration 0006: Push notification device tokens + register RPC
-- ============================================================
-- Context: the mobile app (Expo) sends remote push notifications for World Cup
--   match alerts and app-wide announcements. Devices that opt in register their
--   Expo push token here so the broadcast sender (a service_role Edge Function)
--   can fan a message out to every enabled device.
--
-- Trust model mirrors migration 0005 (subscribers): the token list is WRITE-ONLY
--   from the public app. anon/authenticated may register/refresh their own token
--   via a SECURITY DEFINER RPC, but can NEVER read the list back out (no SELECT
--   policy), so the device list cannot be scraped via PostgREST. Only the
--   service_role (the sender) bypasses RLS to read enabled tokens.
--
-- A device is keyed by its Expo push token (unique). Re-registering the same
--   token UPSERTs (token survives reinstall-ish; lang/platform/enabled refresh).
--   Opt-out flips `enabled=false` rather than deleting, so the sender skips it
--   and DeviceNotRegistered cleanup stays idempotent.
-- Idempotent; safe to re-run (create table if not exists, drop policy if exists
--   before create policy, create or replace function).
-- ============================================================

-- ---------- 1. push_tokens (write-only from the public app) ----------
CREATE TABLE IF NOT EXISTS push_tokens (
  token       TEXT PRIMARY KEY,
  platform    TEXT NOT NULL DEFAULT 'unknown'
                CHECK (platform IN ('ios', 'android', 'unknown')),
  lang        TEXT NOT NULL DEFAULT 'en'
                CHECK (lang IN ('en', 'ar', 'es')),
  enabled     BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- There is deliberately NO anon/authenticated policy of ANY kind on this table.
-- All writes go through the SECURITY DEFINER RPCs below (which run as the
-- function owner and bypass RLS), and all reads happen via service_role (the
-- sender). So anon/authenticated cannot SELECT (no scraping), INSERT, UPDATE,
-- or DELETE the token list directly through PostgREST.

-- Partial index: the sender only ever scans enabled tokens.
CREATE INDEX IF NOT EXISTS push_tokens_enabled_idx
  ON push_tokens (enabled) WHERE enabled;

-- ---------- 2. register_push_token() — upsert a device token ----------
-- SECURITY DEFINER so it can write despite the table's restrictive RLS.
-- search_path is pinned to public (SECURITY DEFINER hardening — prevents a
-- malicious caller from shadowing objects via a poisoned search_path).
-- Validates the Expo push token shape and normalizes platform/lang before
-- upserting. On conflict (token already known) it refreshes platform/lang,
-- re-enables the device, and bumps updated_at. Returns false on a malformed
-- token without writing.
CREATE OR REPLACE FUNCTION public.register_push_token(
  p_token    TEXT,
  p_platform TEXT,
  p_lang     TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Expo tokens look like ExponentPushToken[xxxxxxxx] or ExpoPushToken[xxxxxxxx].
  -- Reject anything else (defense in depth; the app validates too).
  IF p_token IS NULL
     OR p_token !~ '^Expo(nent)?PushToken\[[A-Za-z0-9._-]+\]$' THEN
    RETURN false;
  END IF;

  INSERT INTO public.push_tokens (token, platform, lang, enabled, updated_at)
  VALUES (
    p_token,
    -- Normalize unknown platforms/langs to a safe default rather than failing.
    CASE WHEN p_platform IN ('ios', 'android') THEN p_platform ELSE 'unknown' END,
    CASE WHEN p_lang IN ('en', 'ar', 'es') THEN p_lang ELSE 'en' END,
    true,
    now()
  )
  ON CONFLICT (token) DO UPDATE
    SET platform   = EXCLUDED.platform,
        lang       = EXCLUDED.lang,
        enabled    = true,
        updated_at = now();

  RETURN true;
END;
$$;

-- ---------- 3. set_push_enabled() — opt in/out without deleting ----------
-- Lets a device disable (or re-enable) its own notifications. Flipping enabled
-- to false is the opt-out path: the sender skips disabled tokens. Returns true
-- when a row was touched, false when the token is unknown.
CREATE OR REPLACE FUNCTION public.set_push_enabled(
  p_token   TEXT,
  p_enabled BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_rows INTEGER;
BEGIN
  IF p_token IS NULL OR p_enabled IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.push_tokens
     SET enabled = p_enabled, updated_at = now()
   WHERE token = p_token;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

-- The RPCs are the ONLY public write path (PostgREST exposes them via /rpc).
GRANT EXECUTE ON FUNCTION public.register_push_token(TEXT, TEXT, TEXT)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_push_enabled(TEXT, BOOLEAN)
  TO anon, authenticated;

COMMENT ON TABLE push_tokens IS 'Expo push device tokens for remote notifications. Write-only from anon/authenticated via SECURITY DEFINER RPCs; no read policy so the device list cannot be scraped. service_role (the broadcast sender) bypasses RLS to read enabled tokens.';
COMMENT ON FUNCTION public.register_push_token(TEXT, TEXT, TEXT) IS 'Upsert a device push token (refresh platform/lang, re-enable, bump updated_at). SECURITY DEFINER, search_path=public. Returns false on a malformed Expo token.';
COMMENT ON FUNCTION public.set_push_enabled(TEXT, BOOLEAN) IS 'Opt a device in/out of push without deleting its row. SECURITY DEFINER, search_path=public. Returns false when the token is unknown.';
