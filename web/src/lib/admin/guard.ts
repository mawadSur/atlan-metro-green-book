// SERVER-ONLY admin guard. The mandatory server-side re-check.
//
// No 'use server' directive here: this exports helpers consumed by the action
// modules (a 'use server' module may only export async functions, and we also
// export a typed result). NEVER trust a client-supplied "I am an admin" claim —
// every privileged action calls requireAdmin() first.
import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from './serviceClient';
import { assertAccessToken } from './validate';

const URL_ENV = 'NEXT_PUBLIC_SUPABASE_URL';
const ANON_ENV = 'NEXT_PUBLIC_SUPABASE_ANON_KEY';

export interface AdminIdentity {
  /** The verified auth.users id of the calling admin. */
  uid: string;
}

/**
 * Verify that the caller (identified by their Supabase access token) is an admin.
 *
 * Two independent steps, neither of which trusts the client:
 *   1. Resolve the token to a real user via auth.getUser() on an anon-key client
 *      that carries the caller's bearer token. getUser() validates the JWT with
 *      the auth server — a forged/expired token fails here.
 *   2. Read profiles.role for that uid via the SERVICE client (bypasses RLS) and
 *      require role === 'admin'. The role column is service-role-only to write,
 *      so it cannot be self-escalated.
 *
 * @throws if the token is missing/invalid or the user is not an admin.
 */
export async function requireAdmin(accessToken: string): Promise<AdminIdentity> {
  const token = assertAccessToken(accessToken);

  const url = process.env[URL_ENV];
  const anon = process.env[ANON_ENV];
  if (!url || !anon) {
    throw new Error(
      `[admin] Missing ${URL_ENV} or ${ANON_ENV} — cannot verify caller identity.`
    );
  }

  // Short-lived anon client carrying the caller's bearer token. No session
  // persistence — this exists only to validate the token and resolve the uid.
  const callerClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userErr } = await callerClient.auth.getUser();
  if (userErr || !userData?.user) {
    throw new Error('[admin] Not authenticated: invalid or expired access token.');
  }
  const uid = userData.user.id;

  // Authoritative role check via service role (bypasses RLS; reads any profile).
  const service = createServiceClient();
  const { data: profile, error: profileErr } = await service
    .from('profiles')
    .select('role')
    .eq('id', uid)
    .single();

  if (profileErr || !profile) {
    throw new Error('[admin] Forbidden: no profile found for caller.');
  }
  if (profile.role !== 'admin') {
    throw new Error('[admin] Forbidden: admin role required.');
  }

  return { uid };
}
