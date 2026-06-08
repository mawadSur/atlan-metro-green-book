// Pure validation helpers for the subscribe flow.
//
// NO directive — these are synchronous pure functions so they can be unit
// tested directly. They intentionally live OUTSIDE subscribe.ts because a
// 'use server' module may only export async functions.

/** The honeypot form field name. A real user never fills this (it's hidden). */
export const HONEYPOT_FIELD = 'company';

// Pragmatic email shape check: one @, a local part, a dotted domain, no spaces.
// Not RFC-5322-exhaustive on purpose — the goal is to reject obvious junk
// before we hit the DB, not to be the sole gate (the RPC validates too).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Whether a string looks like a usable email address. */
export function isValidEmail(s: string): boolean {
  if (typeof s !== 'string') return false;
  const trimmed = s.trim();
  if (trimmed.length === 0 || trimmed.length > 254) return false;
  return EMAIL_RE.test(trimmed);
}

/**
 * Whether the bot honeypot was tripped (i.e. the hidden field has a value).
 * Accepts a FormData (or anything with a compatible `.get`).
 */
export function isHoneypotTripped(formData: {
  get(name: string): unknown;
}): boolean {
  try {
    const v = formData.get(HONEYPOT_FIELD);
    return typeof v === 'string' && v.trim().length > 0;
  } catch {
    return false;
  }
}
