'use server';
// SERVER-ONLY admin claim-moderation actions.
//
// Module-level 'use server' so lane A's client components can import these.
// Exports are all async (Next 16 requirement for 'use server' modules). Each
// action re-verifies admin server-side and audits the decision.

import { createServiceClient } from './serviceClient';
import { requireAdmin } from './guard';
import { writeAudit } from './audit';
import { assertUuid, assertClaimStatus } from './validate';
import type { ClaimRequest, ClaimStatus } from '../types';

/** List claim requests (admin moderation queue), optionally filtered by status. */
export async function listClaims(
  accessToken: string,
  status?: ClaimStatus
): Promise<ClaimRequest[]> {
  await requireAdmin(accessToken);
  const service = createServiceClient();

  let query = service.from('claim_requests').select('*');
  if (status !== undefined) {
    query = query.eq('status', assertClaimStatus(status));
  }
  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) throw new Error(`[admin] listClaims failed: ${error.message}`);
  return (data ?? []) as ClaimRequest[];
}

/**
 * Approve a pending claim:
 *   - claim_requests: status='approved', decided_by=<admin uid>, decided_at=now()
 *   - businesses: upsert (uid=requester, claimed_location_id=claim.location_id)
 *   - profiles: set requester's role='business'
 *
 * All driven from the claim row server-side (no client-supplied uid/location) to
 * prevent IDOR. Throws if the claim is not pending.
 */
export async function approveClaim(
  accessToken: string,
  claimId: string
): Promise<ClaimRequest> {
  const { uid: adminUid } = await requireAdmin(accessToken);
  const id = assertUuid(claimId, 'claim id');
  const service = createServiceClient();

  // Load the authoritative claim row first.
  const { data: claim, error: loadErr } = await service
    .from('claim_requests')
    .select('*')
    .eq('id', id)
    .single();
  if (loadErr || !claim) {
    throw new Error('[admin] approveClaim: claim not found.');
  }
  if (claim.status !== 'pending') {
    throw new Error(`[admin] approveClaim: claim is already ${claim.status}.`);
  }

  const requesterUid = claim.requester_uid as string;
  const locationId = claim.location_id as string;

  // 1. Decide the claim.
  const { data: updated, error: updErr } = await service
    .from('claim_requests')
    .update({
      status: 'approved',
      decided_by: adminUid,
      decided_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();
  if (updErr) throw new Error(`[admin] approveClaim failed: ${updErr.message}`);

  // 2. Upsert the business ownership record (keyed on uid).
  const { error: bizErr } = await service
    .from('businesses')
    .upsert(
      { uid: requesterUid, claimed_location_id: locationId },
      { onConflict: 'uid' }
    );
  if (bizErr) throw new Error(`[admin] approveClaim (businesses) failed: ${bizErr.message}`);

  // 3. Promote the requester to the 'business' role.
  const { error: roleErr } = await service
    .from('profiles')
    .update({ role: 'business' })
    .eq('id', requesterUid);
  if (roleErr) throw new Error(`[admin] approveClaim (role) failed: ${roleErr.message}`);

  await writeAudit(service, {
    actorUid: adminUid,
    action: 'claim.approve',
    targetType: 'claim',
    targetId: id,
    detail: { requester_uid: requesterUid, location_id: locationId },
  });
  return updated as ClaimRequest;
}

/**
 * Reject a pending claim: status='rejected', decided_by, decided_at, optional
 * note. Does not change roles or businesses. Throws if not pending.
 */
export async function rejectClaim(
  accessToken: string,
  claimId: string,
  note?: string
): Promise<ClaimRequest> {
  const { uid: adminUid } = await requireAdmin(accessToken);
  const id = assertUuid(claimId, 'claim id');
  const service = createServiceClient();

  const { data: claim, error: loadErr } = await service
    .from('claim_requests')
    .select('status')
    .eq('id', id)
    .single();
  if (loadErr || !claim) {
    throw new Error('[admin] rejectClaim: claim not found.');
  }
  if (claim.status !== 'pending') {
    throw new Error(`[admin] rejectClaim: claim is already ${claim.status}.`);
  }

  const update: Record<string, unknown> = {
    status: 'rejected',
    decided_by: adminUid,
    decided_at: new Date().toISOString(),
  };
  if (typeof note === 'string' && note.trim() !== '') {
    update.note = note.trim();
  }

  const { data: updated, error } = await service
    .from('claim_requests')
    .update(update)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(`[admin] rejectClaim failed: ${error.message}`);

  await writeAudit(service, {
    actorUid: adminUid,
    action: 'claim.reject',
    targetType: 'claim',
    targetId: id,
    detail: note ? { note } : undefined,
  });
  return updated as ClaimRequest;
}
