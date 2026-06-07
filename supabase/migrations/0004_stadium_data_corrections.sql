-- ============================================================
-- Migration 0004: Stadium-area data corrections (T1 verification)
-- ============================================================
-- Context: /plan-eng-review T1 verified the halal/prayer spots closest to
--   Mercedes-Benz Stadium via web research (sheet:
--   ~/.gstack/projects/.../data-verification/2026-06-07-stadium-spots-T1.md).
--   Two spots carried unverified/false halal confidence and must NOT show as
--   community-listed halal on the World Cup match pages (trust is the product).
-- Idempotent; safe to re-run. Targets rows by name_en (no stable slug exists).
-- ============================================================

-- Mukhtaro Beef Burger — existence UNCONFIRMED. Single OpenStreetMap-derived
-- directory entry; no Yelp/Google/Facebook/delivery presence; a different
-- business sits nearby. Likely an OSM "ghost". Demote to unverified so it does
-- not appear as halal until a human physically confirms it exists.
UPDATE locations
  SET halal_status = 'unverified'
  WHERE name_en = 'Mukhtaro Beef Burger'
    AND halal_status <> 'unverified';

-- Divan Restaurant & Bar — full cocktail/wine bar, ZERO positive halal evidence
-- anywhere (own site, Zabihah, directories), menu shows filet mignon + duck
-- confit. No basis for a halal claim. Demote to unverified (exclude from the
-- halal guide unless the kitchen explicitly confirms halal meat by phone).
UPDATE locations
  SET halal_status = 'unverified'
  WHERE name_en = 'Divan Restaurant & Bar'
    AND halal_status <> 'unverified';

-- Mediterranean Grill — address correction. Verified street address is 985
-- Monroe Dr NE (seed had 981). Self-declares halal on its own site, so it
-- stays community-listed. Only fix the address.
UPDATE locations
  SET address = '985 Monroe Drive Northeast'
  WHERE name_en = 'Mediterranean Grill'
    AND address = '981 Monroe Drive Northeast';

-- Blue India — meat reported halal by third-party directories but the venue
-- serves alcohol. alcohol_free is already false in the data; no change needed.
-- (Documented here for the audit trail; no UPDATE.)

-- NOTE: spots that need a human phone-check to reach halal_status='verified'
-- (Baraka Shawarma, Five Points Islamic Center, Mediterranean Grill, the
-- masjids) are intentionally left as 'community-listed' — research cannot set
-- 'verified'. See the T1 action list.
