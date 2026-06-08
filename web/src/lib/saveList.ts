// No-login "My World Cup plan" save list.
//
// NO directive — this module is pure/isomorphic and importable anywhere
// (server actions, route handlers, client components, unit tests). The
// localStorage helpers are individually window-guarded so importing this on
// the server never touches `window`.
//
// The encode/decode codec is base64url (URL- and QR-safe) and works in both
// Node (Buffer) and the browser (btoa/atob) via feature-detection.

const MAX_IDS = 25;
const STORAGE_KEY = 'gb_saved_v1';

// A place id is a UUID-ish string. We accept canonical UUIDs (with or without
// hyphens) up to 36 chars. This is deliberately strict: decode() is a trust
// boundary (tokens come from URLs / QR codes), so anything that doesn't look
// like an id is dropped rather than trusted.
const ID_RE = /^[0-9a-fA-F-]{8,36}$/;

function isIdLike(s: unknown): s is string {
  return typeof s === 'string' && ID_RE.test(s);
}

// ---------------------------------------------------------------------------
// Isomorphic base64url codec
// ---------------------------------------------------------------------------

function toBase64Url(b64: string): string {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(b64url: string): string {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  // Restore padding to a multiple of 4.
  const pad = b64.length % 4;
  if (pad === 2) b64 += '==';
  else if (pad === 3) b64 += '=';
  else if (pad === 1) b64 += '==='; // malformed, but keep atob/Buffer happy enough to fail cleanly
  return b64;
}

function utf8ToBase64(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf-8').toString('base64');
  }
  // Browser: btoa needs a binary string; encode UTF-8 first.
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  // eslint-disable-next-line no-undef
  return btoa(binary);
}

function base64ToUtf8(b64: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(b64, 'base64').toString('utf-8');
  }
  // eslint-disable-next-line no-undef
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

// ---------------------------------------------------------------------------
// Encode / decode
// ---------------------------------------------------------------------------

/**
 * Encode an array of place ids into a compact, URL/QR-safe base64url token.
 * Caps at {@link MAX_IDS} ids (extras are dropped). Non-string / non-id-like
 * entries are filtered out so the token is always well-formed.
 */
export function encodeSavedIds(ids: string[]): string {
  const clean = (Array.isArray(ids) ? ids : [])
    .filter(isIdLike)
    .slice(0, MAX_IDS);
  const json = JSON.stringify(clean);
  return toBase64Url(utf8ToBase64(json));
}

/**
 * Decode a base64url token back into a validated array of place ids.
 *
 * This is a HARD trust boundary: tokens arrive from untrusted URLs / QR codes.
 * On ANY malformed, oversized, or non-array input we return [] — never throw.
 * A multi-thousand-id blob is treated as a DoS attempt and rejected (capped).
 */
export function decodeSavedIds(token: string): string[] {
  try {
    if (typeof token !== 'string' || token.length === 0) return [];
    // Reject absurdly large tokens before we even decode (cheap DoS guard).
    // 25 UUIDs JSON-encoded is well under ~1KB; base64 inflates ~1.34x.
    if (token.length > 4096) return [];

    const json = base64ToUtf8(fromBase64Url(token));
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];

    const out: string[] = [];
    for (const item of parsed) {
      if (out.length >= MAX_IDS) break; // cap — drop extras
      if (isIdLike(item)) out.push(item);
    }
    return out;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// localStorage helpers (client-only; window-guarded)
// ---------------------------------------------------------------------------

/** Read the saved ids from localStorage. Returns [] on the server or on error. */
export function getSaved(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isIdLike).slice(0, MAX_IDS);
  } catch {
    return [];
  }
}

/** Toggle an id in the saved list and persist. Returns the new list. */
export function toggleSaved(id: string): string[] {
  if (typeof window === 'undefined') return [];
  const current = getSaved();
  let next: string[];
  if (current.includes(id)) {
    next = current.filter((x) => x !== id);
  } else {
    if (!isIdLike(id)) return current;
    next = [...current, id].slice(0, MAX_IDS);
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota / private-mode failures are non-fatal — return the intended list.
  }
  return next;
}

/** Whether an id is currently saved. False on the server. */
export function isSaved(id: string): boolean {
  if (typeof window === 'undefined') return false;
  return getSaved().includes(id);
}
