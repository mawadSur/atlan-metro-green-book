// SERVER-ONLY input validation for the admin action boundary.
//
// Every value crossing into a privileged (service-role) action MUST be validated
// here first. No 'use server' directive: this is a plain server utility (and a
// 'use server' module may only export async functions).
import 'server-only';

import type { Role, ClaimStatus } from '../types';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ROLES: readonly Role[] = ['user', 'business', 'admin'];
const CLAIM_STATUSES: readonly ClaimStatus[] = ['pending', 'approved', 'rejected'];

// Conservative email shape check — non-empty, single @, no spaces. Auth is the
// ultimate authority; this just rejects obvious garbage at the boundary.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Assert a value is a syntactically valid UUID; returns the normalized string. */
export function assertUuid(value: unknown, field = 'id'): string {
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw new Error(`[admin] Invalid ${field}: expected a UUID.`);
  }
  return value;
}

/** Assert a value is a non-empty, plausibly-shaped email. */
export function assertEmail(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '' || !EMAIL_RE.test(value.trim())) {
    throw new Error('[admin] Invalid email address.');
  }
  return value.trim();
}

/** Assert a value is one of the allowed roles. */
export function assertRole(value: unknown): Role {
  if (typeof value !== 'string' || !ROLES.includes(value as Role)) {
    throw new Error(`[admin] Invalid role: expected one of ${ROLES.join(', ')}.`);
  }
  return value as Role;
}

/** Assert a value is one of the allowed claim statuses. */
export function assertClaimStatus(value: unknown): ClaimStatus {
  if (typeof value !== 'string' || !CLAIM_STATUSES.includes(value as ClaimStatus)) {
    throw new Error(
      `[admin] Invalid claim status: expected one of ${CLAIM_STATUSES.join(', ')}.`
    );
  }
  return value as ClaimStatus;
}

/** Assert a non-empty string (e.g. a password or admin display name). */
export function assertNonEmptyString(value: unknown, field = 'value'): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`[admin] Invalid ${field}: must be a non-empty string.`);
  }
  return value;
}

/** Assert the caller's access token looks like a non-empty bearer token. */
export function assertAccessToken(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('[admin] Missing access token: caller is not authenticated.');
  }
  return value;
}
