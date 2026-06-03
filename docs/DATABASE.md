# Database Architecture

Atlan Metro Green Book uses a **two-tier, local-first** data model.

```
┌─ Tier 1: Bundled seed (offline, no account) ────────────────┐
│  src/data/*.js   — typed locations + city registry          │
│  AsyncStorage    — user prefs, favorites, language, filters  │
│  Works 100% offline. Ships inside the app binary.            │
└───────────────────────────────────────────────────────────────┘
                          │  syncs with (when keys present)
┌─ Tier 2: Supabase (Postgres) ───────────────────────────────┐
│  Postgres tables + Row-Level Security                        │
│  Supabase Auth      — business owners log in                 │
│  Realtime           — live discount-code / offer updates     │
│  Source of truth for shared + onboarded data                 │
└───────────────────────────────────────────────────────────────┘
```

The app reads Tier 1 first (instant, offline) and overlays Tier 2 when available.
If no Supabase keys are configured, the app runs entirely on Tier 1.

> The `ruvector.db` and `.swarm/memory.db` files in the repo root belong to the
> **ruflo / claude-flow build tooling**, not the app. They are git-ignored.

## Schema (Postgres)

```sql
-- A city is a first-class entity (multi-city platform)
create table cities (
  id            text primary key,            -- e.g. 'atlanta'
  name_en       text not null,
  name_ar       text not null,
  name_es       text not null,
  country       text not null,
  center_lat    double precision not null,
  center_lng    double precision not null,
  default_zoom  int default 11,
  timezone      text,
  is_active     boolean default true,
  source        text default 'seed',         -- 'seed' | 'osm-onboarded'
  created_at    timestamptz default now()
);

-- The core place record
create table locations (
  id               uuid primary key default gen_random_uuid(),
  city_id          text not null references cities(id),
  type             text not null,            -- masjid|restaurant|coffee|grocery|garments|park|museum|attraction|mall|worldcup_venue
  name_en          text not null,
  name_ar          text,
  name_es          text,
  address          text,
  lat              double precision not null,
  lng              double precision not null,
  phone            text,
  hours_en         text,
  hours_ar         text,
  hours_es         text,
  halal_certified  boolean default false,
  alcohol_free     boolean default false,
  prayer_space     boolean default false,
  family_friendly  boolean default false,
  worldcup_special boolean default false,
  -- discount fields live here for read; writes gated to the claiming owner
  discount_code    text,
  discount_offer_en text,
  discount_offer_ar text,
  discount_offer_es text,
  claimed_by       uuid references auth.users(id),  -- business owner, nullable
  source           text default 'seed',     -- 'seed' | 'osm' | 'user'
  osm_id           text,                     -- dedupe key for onboarding
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- A business owner's profile / claim
create table businesses (
  uid                  uuid primary key references auth.users(id),
  email                text,
  claimed_location_id  uuid references locations(id),
  created_at           timestamptz default now()
);

create index on locations (city_id);
create index on locations (type);
create index on locations (osm_id);
```

## Row-Level Security

```sql
alter table cities    enable row level security;
alter table locations enable row level security;
alter table businesses enable row level security;

-- Anyone can read the public data
create policy "public read cities"    on cities    for select using (true);
create policy "public read locations" on locations for select using (true);

-- A business owner may update ONLY the location they have claimed,
-- and only the discount/offer columns (enforced in app + a column check).
create policy "owner updates own location" on locations
  for update
  using  (auth.uid() = claimed_by)
  with check (auth.uid() = claimed_by);

-- Owners manage their own business row
create policy "owner manages own business" on businesses
  for all using (auth.uid() = uid) with check (auth.uid() = uid);
```

This mirrors the original Firestore rule from the spec: a business may edit only the
location whose `claimed_by` / `claimed_location_id` matches their authenticated user.

## Configuration

Supabase keys are read from env (never committed):

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

When these are absent, `src/lib/supabase` returns `null` and the app stays on Tier 1.

## Onboarding writes

The auto-onboarding engine (see `ONBOARDING.md`) produces normalized rows that are:
1. written to a Tier-1 seed file for instant inclusion, and
2. optionally upserted into Supabase `cities` + `locations` (deduped on `osm_id`).
