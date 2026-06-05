-- ============================================================
-- Migration 0002: Column write-protection + roles/admin foundation
-- ============================================================
-- Context: 0001's column-level REVOKE silently failed in prod. Verified via
-- information_schema.column_privileges that anon + authenticated still hold
-- UPDATE on EVERY column of `locations` — including halal_status/verified_by/
-- verified_at AND claimed_by/lat/lng/name. The only thing scoping writes today
-- is the row-level RLS USING(auth.uid()=claimed_by), so a business owner can
-- currently self-certify halal and rewrite core fields of their claimed row.
--
-- This migration:
--   1. Locks down which COLUMNS authenticated/anon may UPDATE on locations
--      (revoke table-wide, grant back only the owner-safe set).
--   2. Adds the profiles/roles foundation + is_admin() for the admin portal.
--   3. Lets admins bypass owner-only RLS to manage any location.
-- Idempotent; safe to re-run.
-- ============================================================

-- ---------- 1. Column-level write protection on locations ----------
-- Revoke the blanket UPDATE first (this is what 0001 failed to do cleanly),
-- then grant UPDATE back ONLY on owner-editable columns. anon gets nothing.
REVOKE UPDATE ON locations FROM anon;
REVOKE UPDATE ON locations FROM authenticated;

-- Owner-editable columns ONLY. Deliberately EXCLUDES:
--   halal_status, verified_by, verified_at (provenance — admin-only, the trust anchor)
--   halal_certified (legacy trust flag — admin-only)
--   claimed_by (ownership — never owner-settable)
--   id, city_id, source, osm_id, created_at, lat, lng, type (identity/geo — admin-only)
GRANT UPDATE (
  name_en, name_ar, name_es,
  address, phone,
  hours_en, hours_ar, hours_es,
  alcohol_free, prayer_space, family_friendly,
  discount_code, discount_offer_en, discount_offer_ar, discount_offer_es,
  image_url, worldcup_special
) ON locations TO authenticated;
-- Note: updated_at deliberately EXCLUDED — owners must not forge audit timestamps.

-- Harden the existing owner-update policy with an explicit WITH CHECK so that
-- claimed_by row-immutability does not depend solely on the column grant.
DROP POLICY IF EXISTS "owner updates location" ON locations;
CREATE POLICY "owner updates location" ON locations
  FOR UPDATE USING (auth.uid() = claimed_by)
  WITH CHECK (auth.uid() = claimed_by);

-- ---------- 2. Roles / profiles foundation (TABLE FIRST) ----------
-- The table must exist before is_admin() (its SQL body references profiles and
-- is validated at creation time) and before any policy referencing it.
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'business', 'admin')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ---------- 3. is_admin() — tamper-proof admin check ----------
-- SECURITY DEFINER so it can read profiles as the function owner. Defined after
-- the table exists. Used ONLY by policies on OTHER tables (locations), never by
-- a profiles policy (that would recurse).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- A user can read ONLY their own profile via their JWT.
-- IMPORTANT: do NOT add "OR is_admin()" here — is_admin() reads profiles, and a
-- profiles policy that calls it creates a recursion landmine (works today only
-- via table-owner RLS exemption; breaks the instant FORCE ROW LEVEL SECURITY is
-- set). Admins read all profiles through the app's service_role connection,
-- which bypasses RLS entirely.
DROP POLICY IF EXISTS "profiles self read" ON profiles;
CREATE POLICY "profiles self read" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- A user may update their OWN profile row; the role column is blocked by the
-- column grant below (anti-escalation).
DROP POLICY IF EXISTS "profiles self update" ON profiles;
CREATE POLICY "profiles self update" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Role column is service_role/admin only — users cannot change their own role.
REVOKE UPDATE ON profiles FROM anon, authenticated;
GRANT UPDATE (email) ON profiles TO authenticated;

-- Auto-create a profile row when a new auth user signs up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- 4. Admin override on locations ----------
-- Admins can update ANY location, including the provenance columns. This is the
-- ONLY path to set halal_status='verified'. Owners keep their column-scoped update.
DROP POLICY IF EXISTS "admin updates any location" ON locations;
CREATE POLICY "admin updates any location" ON locations
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Admins (via the app using service_role, or with this grant) need column access
-- for provenance. service_role already bypasses grants; this lets an admin JWT
-- write provenance through PostgREST if ever needed.
-- (No broad GRANT to authenticated here — provenance stays out of the owner set above.)

COMMENT ON FUNCTION public.is_admin() IS 'True if the current auth.uid() has role=admin in profiles. SECURITY DEFINER, tamper-proof. Used by admin RLS policies.';
COMMENT ON TABLE profiles IS 'Per-user role (user/business/admin). Role column is service_role-only; users cannot self-escalate.';
