/**
 * Server-only Supabase service-role client for admin operations.
 * NEVER import this module in a client component.
 * Requires SUPABASE_SERVICE_ROLE_KEY env var set on the server.
 */

import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Service-role client with full admin access to auth.admin APIs.
 * DO NOT expose this client or the service key to the client.
 */
export function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL. ' +
        'Set SUPABASE_SERVICE_ROLE_KEY in Vercel environment variables (server-only, NOT NEXT_PUBLIC_*).'
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Verify that the caller (identified by their JWT access token) is an admin.
 * Defense-in-depth: ALWAYS call this in every server action before admin operations.
 * Throws if the user is not an admin or if the token is invalid.
 *
 * @param accessToken - The caller's Supabase JWT (from client session)
 */
export async function requireAdmin(accessToken: string): Promise<string> {
  const serviceClient = getServiceRoleClient();

  // Parse the JWT to get the user ID (Supabase SDK does this for us)
  const {
    data: { user },
    error: authError,
  } = await serviceClient.auth.getUser(accessToken);

  if (authError || !user) {
    throw new Error('Invalid or expired access token');
  }

  // Check that the user's profile has role='admin'
  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    throw new Error('Forbidden: admin role required');
  }

  return user.id;
}
