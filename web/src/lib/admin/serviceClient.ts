// SERVER-ONLY Supabase service-role client factory.
//
// `server-only` makes this module impossible to import from a Client Component:
// any such import is a build-time error. The service-role key bypasses RLS and
// must NEVER reach the browser bundle.
//
// IMPORTANT: this file holds NO 'use server' directive — it exports a synchronous
// factory, and a 'use server' module may only export async functions. It is a
// plain server utility consumed by the action modules.
import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The service role key is read WITHOUT a NEXT_PUBLIC_ prefix on purpose: anything
// prefixed NEXT_PUBLIC_ is inlined into the client bundle by Next.js. This var is
// server-only and must stay that way.
const SERVICE_ROLE_ENV = 'SUPABASE_SERVICE_ROLE_KEY';
const URL_ENV = 'NEXT_PUBLIC_SUPABASE_URL';

/**
 * Build a Supabase client authenticated with the service-role key.
 *
 * This client BYPASSES Row-Level Security. It must only ever run on the server
 * and must only be used AFTER an admin identity has been verified via
 * `requireAdmin` (see guard.ts). Never expose it, its key, or any value derived
 * from process.env.SUPABASE_SERVICE_ROLE_KEY to a client component.
 *
 * @throws if either required environment variable is missing.
 */
export function createServiceClient(): SupabaseClient {
  const url = process.env[URL_ENV];
  const serviceKey = process.env[SERVICE_ROLE_ENV];

  if (!url) {
    throw new Error(
      `[admin] Missing required env var ${URL_ENV}. ` +
        `Set it in your server environment (.env.local / deployment secrets).`
    );
  }
  if (!serviceKey) {
    throw new Error(
      `[admin] Missing required env var ${SERVICE_ROLE_ENV}. ` +
        `This is a SERVER-ONLY secret — it must NOT be prefixed NEXT_PUBLIC_ ` +
        `and must never be sent to the browser.`
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
