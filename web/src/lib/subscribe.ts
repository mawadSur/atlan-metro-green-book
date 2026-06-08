'use server';

// Server Action: subscribe an email to the match-day guide.
//
// A 'use server' file may ONLY export async functions, so the pure helpers
// (isValidEmail / isHoneypotTripped) live in ./email-validate and are imported
// here. We STORE ONLY — no transactional email is sent from this module.

import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { isValidEmail, isHoneypotTripped } from './email-validate';

export interface SubscribeResult {
  ok: boolean;
  reason?: 'invalid' | 'ratelimited' | 'error';
}

type Audience = 'local' | 'visitor';

function normalizeAudience(raw: unknown): Audience {
  return raw === 'local' ? 'local' : 'visitor';
}

function hashIp(ip: string): string {
  // Salt-free per-IP hash is enough for a coarse rate-limit bucket; we never
  // store the raw IP. An empty/unknown IP still hashes to a stable bucket.
  return createHash('sha256').update(ip || 'unknown').digest('hex');
}

/**
 * Subscribe the submitted email. Designed to be used with React's
 * useActionState — signature is (prevState, formData).
 *
 * - Honeypot: if the hidden 'company' field is filled, we silently return a
 *   success shape WITHOUT inserting (don't tip off the bot).
 * - Validates email shape server-side before touching the DB.
 * - Derives a hashed client IP from x-forwarded-for for server-side rate
 *   limiting inside the SECURITY DEFINER RPC.
 */
export async function subscribeEmail(
  _prevState: SubscribeResult | null,
  formData: FormData
): Promise<SubscribeResult> {
  // Bot trap — pretend success, insert nothing.
  if (isHoneypotTripped(formData)) {
    return { ok: true };
  }

  const emailRaw = formData.get('email');
  const email = typeof emailRaw === 'string' ? emailRaw.trim() : '';
  if (!isValidEmail(email)) {
    return { ok: false, reason: 'invalid' };
  }

  const audience = normalizeAudience(formData.get('audience'));

  const utmRaw = formData.get('utm_source');
  const utm =
    typeof utmRaw === 'string' && utmRaw.length > 0
      ? utmRaw.slice(0, 128)
      : null;

  // headers() is async in Next 16.
  const h = await headers();
  const ip = (h.get('x-forwarded-for') || '').split(',')[0].trim();
  const ipHash = hashIp(ip);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return { ok: false, reason: 'error' };
  }

  // Request-scoped anon client — no session persistence on the server.
  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  try {
    const { data, error } = await supabase.rpc('subscribe_email', {
      p_email: email,
      p_audience: audience,
      p_utm: utm,
      p_ip_hash: ipHash,
    });

    if (error) {
      return { ok: false, reason: 'error' };
    }

    // RPC returns boolean: false means rate-limited (or rejected) by the DB.
    if (data === false) {
      return { ok: false, reason: 'ratelimited' };
    }

    return { ok: true };
  } catch {
    return { ok: false, reason: 'error' };
  }
}
