'use server';
// SERVER-ONLY admin location actions.
//
// The module-level 'use server' directive marks every export as a Server Action
// so client components (lane A) can import and invoke them; the bodies never run
// in the browser. Per Next 16, a 'use server' module may export ONLY async
// functions — types/helpers live in sibling non-action modules.
//
// Every action re-verifies admin identity SERVER-SIDE via requireAdmin (never
// trust the client) and audits each mutation.

import { createServiceClient } from './serviceClient';
import { requireAdmin } from './guard';
import { writeAudit } from './audit';
import { assertUuid, assertNonEmptyString } from './validate';
import type { Location, LocationType } from '../types';

export interface ListLocationsOptions {
  cityId?: string;
  types?: LocationType[];
  limit?: number;
  offset?: number;
}

// Owner/admin-editable descriptive columns. Provenance and identity/geo columns
// are deliberately excluded — provenance is set ONLY via verifyHalal/unverifyHalal.
export interface LocationPatch {
  name_en?: string;
  name_ar?: string;
  name_es?: string;
  address?: string;
  phone?: string;
  hours_en?: string;
  hours_ar?: string;
  hours_es?: string;
  alcohol_free?: boolean;
  prayer_space?: boolean;
  family_friendly?: boolean;
  worldcup_special?: boolean;
  discount_code?: string | null;
  discount_offer_en?: string;
  discount_offer_ar?: string;
  discount_offer_es?: string;
  image_url?: string;
}

const EDITABLE_FIELDS: ReadonlyArray<keyof LocationPatch> = [
  'name_en', 'name_ar', 'name_es',
  'address', 'phone',
  'hours_en', 'hours_ar', 'hours_es',
  'alcohol_free', 'prayer_space', 'family_friendly', 'worldcup_special',
  'discount_code', 'discount_offer_en', 'discount_offer_ar', 'discount_offer_es',
  'image_url',
];

/** List locations (admin). Optional city/type filter + pagination. */
export async function listLocations(
  accessToken: string,
  opts: ListLocationsOptions = {}
): Promise<Location[]> {
  await requireAdmin(accessToken);
  const service = createServiceClient();

  const { cityId, types, limit = 500, offset = 0 } = opts;
  let query = service.from('locations').select('*');
  if (cityId) query = query.eq('city_id', assertNonEmptyString(cityId, 'cityId'));
  if (types && types.length > 0) query = query.in('type', types);
  query = query.order('name_en').range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw new Error(`[admin] listLocations failed: ${error.message}`);
  return (data ?? []) as Location[];
}

/**
 * Edit the descriptive fields of any location (admin override).
 * Provenance columns are NOT editable here — use verifyHalal/unverifyHalal.
 */
export async function editLocation(
  accessToken: string,
  id: string,
  patch: LocationPatch
): Promise<Location> {
  const { uid } = await requireAdmin(accessToken);
  const locationId = assertUuid(id, 'location id');

  // Whitelist: copy only known-editable fields, dropping anything else (e.g. an
  // attempt to slip in halal_status / verified_by / claimed_by / lat / lng).
  const update: Record<string, unknown> = {};
  for (const key of EDITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      update[key] = patch[key];
    }
  }
  if (Object.keys(update).length === 0) {
    throw new Error('[admin] editLocation: no editable fields provided.');
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from('locations')
    .update(update)
    .eq('id', locationId)
    .select('*')
    .single();
  if (error) throw new Error(`[admin] editLocation failed: ${error.message}`);

  await writeAudit(service, {
    actorUid: uid,
    action: 'location.edit',
    targetType: 'location',
    targetId: locationId,
    detail: { fields: Object.keys(update) },
  });
  return data as Location;
}

/**
 * Mark a location's halal status as verified provenance.
 * Sets halal_status='verified', verified_by=<admin name>, verified_at=now().
 */
export async function verifyHalal(
  accessToken: string,
  id: string,
  verifiedBy: string
): Promise<Location> {
  const { uid } = await requireAdmin(accessToken);
  const locationId = assertUuid(id, 'location id');
  const verifier = assertNonEmptyString(verifiedBy, 'verifiedBy');

  const service = createServiceClient();
  const { data, error } = await service
    .from('locations')
    .update({
      halal_status: 'verified',
      verified_by: verifier,
      verified_at: new Date().toISOString(),
    })
    .eq('id', locationId)
    .select('*')
    .single();
  if (error) throw new Error(`[admin] verifyHalal failed: ${error.message}`);

  await writeAudit(service, {
    actorUid: uid,
    action: 'location.verify_halal',
    targetType: 'location',
    targetId: locationId,
    detail: { verified_by: verifier },
  });
  return data as Location;
}

/**
 * Revoke halal verification, returning the location to community-listed.
 * Sets halal_status='community-listed', verified_by='', verified_at=null.
 */
export async function unverifyHalal(
  accessToken: string,
  id: string
): Promise<Location> {
  const { uid } = await requireAdmin(accessToken);
  const locationId = assertUuid(id, 'location id');

  const service = createServiceClient();
  const { data, error } = await service
    .from('locations')
    .update({
      halal_status: 'community-listed',
      verified_by: '',
      verified_at: null,
    })
    .eq('id', locationId)
    .select('*')
    .single();
  if (error) throw new Error(`[admin] unverifyHalal failed: ${error.message}`);

  await writeAudit(service, {
    actorUid: uid,
    action: 'location.unverify_halal',
    targetType: 'location',
    targetId: locationId,
  });
  return data as Location;
}
