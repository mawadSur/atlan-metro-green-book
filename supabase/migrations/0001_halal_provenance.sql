-- ============================================================
-- Migration: Add halal provenance tracking columns
-- ============================================================
-- Purpose: Replace blanket halal_certified boolean with granular
--          provenance tracking (verified, community-listed, unverified).
--
-- Security: These columns are admin-only; business owners cannot
--           modify halal_status/verified_by/verified_at to prevent
--           false halal claims (existential risk for the platform).
-- ============================================================

-- Add new provenance columns (idempotent)
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS halal_status TEXT NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS verified_by TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Add constraint to enforce allowed values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'locations_halal_status_check'
    AND conrelid = 'locations'::regclass
  ) THEN
    ALTER TABLE locations
      ADD CONSTRAINT locations_halal_status_check
      CHECK (halal_status IN ('verified', 'community-listed', 'unverified'));
  END IF;
END $$;

-- Backfill: All existing rows become 'community-listed'
-- (None are 'verified' yet since no human/mosque has verified anything.
--  'verified' status is reserved for future manual review.)
UPDATE locations
SET halal_status = 'community-listed'
WHERE halal_status = 'unverified';

-- Security: Revoke UPDATE privileges on provenance columns from non-admin roles
-- This prevents business owners from self-certifying halal status.
-- Only service_role and postgres can modify these columns.
DO $$
BEGIN
  -- Revoke column-level UPDATE privilege from anon and authenticated roles
  REVOKE UPDATE (halal_status) ON locations FROM anon, authenticated;
  REVOKE UPDATE (verified_by) ON locations FROM anon, authenticated;
  REVOKE UPDATE (verified_at) ON locations FROM anon, authenticated;

  -- Note: Column-level privileges work in Supabase's role model.
  -- If issues arise, contact admin to review Supabase role hierarchy.
EXCEPTION
  WHEN insufficient_privilege THEN
    -- Log warning but don't fail migration if privileges can't be revoked
    RAISE WARNING 'Could not revoke UPDATE privileges on provenance columns. Manual review required.';
END $$;

-- Create index for efficient filtering by halal_status
CREATE INDEX IF NOT EXISTS locations_halal_status_idx ON locations (halal_status);

-- Add comment documenting the security model
COMMENT ON COLUMN locations.halal_status IS
  'Halal provenance status: verified (mosque/certifier confirmed) | community-listed (OSM/user submitted, unverified) | unverified (default). Admin-only updates.';
COMMENT ON COLUMN locations.verified_by IS
  'Name of mosque/certifier that verified halal status. Empty string when unverified. Admin-only updates.';
COMMENT ON COLUMN locations.verified_at IS
  'Timestamp when halal status was verified. NULL when unverified. Admin-only updates.';
