import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load Supabase credentials from .secrets/supabase.env
function loadEnv() {
  try {
    const envPath = join(process.cwd(), '.secrets', 'supabase.env');
    const content = readFileSync(envPath, 'utf-8');
    const env = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
    return env;
  } catch (err) {
    return null;
  }
}

const env = loadEnv();
const hasCredentials =
  env &&
  env.SUPABASE_URL &&
  env.SUPABASE_ANON_KEY &&
  env.DEMO_OWNER_EMAIL &&
  env.DEMO_OWNER_PASS;

// Gracefully skip if credentials unavailable
const describeIf = hasCredentials ? describe : describe.skip;

describeIf('RLS security (integration)', () => {
  let anonClient;
  let ownerClient;
  let ownerLocationId;
  let originalDiscountOffer;
  let ownerHasLocation = false;

  beforeAll(async () => {
    if (!hasCredentials) return;

    // Create anon client
    anonClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

    // Create authenticated owner client
    ownerClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const { data: authData, error: authError } = await ownerClient.auth.signInWithPassword({
      email: env.DEMO_OWNER_EMAIL,
      password: env.DEMO_OWNER_PASS,
    });

    if (authError) {
      console.warn('Demo owner sign-in failed:', authError.message);
      return;
    }

    // Try to find the owner's claimed location.
    // NOTE: the businesses PK/owner column is `uid`, not `owner_id`.
    const { data: business, error: bizError } = await ownerClient
      .from('businesses')
      .select('claimed_location_id')
      .eq('uid', authData.user.id)
      .maybeSingle();

    if (!bizError && business?.claimed_location_id) {
      ownerLocationId = business.claimed_location_id;
      ownerHasLocation = true;

      // Read original discount_offer_en to restore later
      const { data: loc } = await ownerClient
        .from('locations')
        .select('discount_offer_en')
        .eq('id', ownerLocationId)
        .single();

      originalDiscountOffer = loc?.discount_offer_en || '';
    } else {
      console.warn('No claimed location found for demo owner; owner-specific tests will skip');
    }
  });

  afterAll(async () => {
    if (!hasCredentials) return;

    // Restore original value if we modified anything
    if (ownerHasLocation && ownerLocationId) {
      await ownerClient
        .from('locations')
        .update({ discount_offer_en: originalDiscountOffer })
        .eq('id', ownerLocationId);
    }

    // Sign out
    if (ownerClient) {
      await ownerClient.auth.signOut();
    }
  });

  it('anon SELECT on locations returns rows (public read works)', async () => {
    const { data, error } = await anonClient.from('locations').select('id').limit(5);

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.length).toBeGreaterThan(0);
  });

  it('anon UPDATE on any location discount_code is blocked by RLS', async () => {
    // Pick the first location
    const { data: locations } = await anonClient.from('locations').select('id').limit(1);
    const locationId = locations?.[0]?.id;

    if (!locationId) {
      console.warn('No locations found, skipping anon UPDATE test');
      return;
    }

    const { data, error } = await anonClient
      .from('locations')
      .update({ discount_code: 'ANON_HACK' })
      .eq('id', locationId)
      .select();

    // RLS denies: either error or zero rows affected
    expect(data === null || data.length === 0).toBe(true);
  });

  it('signed-in owner UPDATE their claimed location succeeds', async () => {
    if (!ownerHasLocation) {
      console.warn('Skipping: demo owner has no claimed location');
      return;
    }

    const sentinel = `TEST_OFFER_${Date.now()}`;

    const { data, error } = await ownerClient
      .from('locations')
      .update({ discount_offer_en: sentinel })
      .eq('id', ownerLocationId)
      .select('discount_offer_en');

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.length).toBe(1);
    expect(data[0].discount_offer_en).toBe(sentinel);
  });

  it('signed-in owner UPDATE a different location is denied', async () => {
    if (!ownerHasLocation) {
      console.warn('Skipping: demo owner has no claimed location');
      return;
    }

    // Find a location NOT owned by the demo owner
    const { data: allLocations } = await ownerClient
      .from('locations')
      .select('id')
      .neq('id', ownerLocationId)
      .limit(1);

    const otherLocationId = allLocations?.[0]?.id;

    if (!otherLocationId) {
      console.warn('No other locations found, skipping cross-owner UPDATE test');
      return;
    }

    const { data, error } = await ownerClient
      .from('locations')
      .update({ discount_offer_en: 'HACKED' })
      .eq('id', otherLocationId)
      .select();

    // RLS denies: zero rows affected
    expect(data === null || data.length === 0).toBe(true);
  });
});

if (!hasCredentials) {
  console.log(
    '[RLS tests skipped] .secrets/supabase.env not found or missing keys. Run tests with valid Supabase credentials to enable integration tests.',
  );
}
