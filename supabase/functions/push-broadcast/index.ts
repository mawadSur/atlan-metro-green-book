// Supabase Edge Function: push-broadcast
// ============================================================
// Sends a remote push notification to opted-in devices via the Expo Push API.
//
// Trust model: this is the ONLY reader of the write-only push_tokens table
// (migration 0006). It runs with the service role (bypasses RLS) and is itself
// gated by a shared secret header (PUSH_BROADCAST_SECRET) so only the operator
// can trigger a broadcast — never an anon client.
//
// Request (POST, JSON):
//   {
//     "title":  "Spain vs Saudi Arabia",        // required
//     "body":   "Kickoff in 1 hour — find prayer spaces & halal nearby",  // required
//     "url":    "/match/spain-saudi-arabia",     // optional in-app deep link (tap target)
//     "lang":   "en" | "ar" | "es",              // optional: target one language only
//     "dryRun": true                              // optional: count recipients, send nothing
//   }
// Header:  x-broadcast-secret: <PUSH_BROADCAST_SECRET>
//
// Response: { ok, recipients, sent, invalidated, dryRun }
//
// Env (set with `supabase secrets set`):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (auto-injected in deployed funcs)
//   PUSH_BROADCAST_SECRET                     (you set this)
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100; // Expo accepts up to 100 messages per request.
const VALID_LANGS = ['en', 'ar', 'es'];

interface BroadcastBody {
  title?: string;
  body?: string;
  url?: string;
  lang?: string;
  dryRun?: boolean;
}

interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return json({ ok: false, error: 'method_not_allowed' }, 405);
  }

  // --- auth: shared-secret gate ---
  const secret = Deno.env.get('PUSH_BROADCAST_SECRET');
  if (!secret || req.headers.get('x-broadcast-secret') !== secret) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }

  // --- parse + validate input ---
  let payload: BroadcastBody;
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  const title = payload.title?.trim();
  const body = payload.body?.trim();
  if (!title || !body) {
    return json({ ok: false, error: 'title_and_body_required' }, 400);
  }
  if (payload.lang && !VALID_LANGS.includes(payload.lang)) {
    return json({ ok: false, error: 'invalid_lang' }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // --- read enabled tokens (optionally language-targeted) ---
  let query = supabase.from('push_tokens').select('token').eq('enabled', true);
  if (payload.lang) query = query.eq('lang', payload.lang);
  const { data: rows, error } = await query;
  if (error) {
    return json({ ok: false, error: 'db_read_failed', detail: error.message }, 500);
  }

  const tokens = (rows ?? []).map((r: { token: string }) => r.token);
  if (payload.dryRun) {
    return json({ ok: true, recipients: tokens.length, sent: 0, invalidated: 0, dryRun: true });
  }
  if (tokens.length === 0) {
    return json({ ok: true, recipients: 0, sent: 0, invalidated: 0, dryRun: false });
  }

  // --- send via Expo Push API, chunked ---
  const data = payload.url ? { url: payload.url } : {};
  let sent = 0;
  const invalidTokens: string[] = [];

  for (const batch of chunk(tokens, CHUNK_SIZE)) {
    const messages = batch.map((to) => ({
      to,
      title,
      body,
      sound: 'default',
      data,
    }));

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify(messages),
      });
      const result = await res.json();
      const tickets: ExpoTicket[] = result?.data ?? [];

      tickets.forEach((ticket, i) => {
        if (ticket.status === 'ok') {
          sent++;
        } else if (ticket.details?.error === 'DeviceNotRegistered') {
          // The device uninstalled or revoked — collect for cleanup.
          invalidTokens.push(batch[i]);
        }
      });
    } catch (err) {
      console.error('Expo push batch failed:', err);
      // Continue with remaining batches; partial delivery is fine.
    }
  }

  // --- disable dead tokens so future broadcasts skip them ---
  if (invalidTokens.length > 0) {
    const { error: cleanupErr } = await supabase
      .from('push_tokens')
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .in('token', invalidTokens);
    if (cleanupErr) console.error('Token cleanup failed:', cleanupErr.message);
  }

  return json({
    ok: true,
    recipients: tokens.length,
    sent,
    invalidated: invalidTokens.length,
    dryRun: false,
  });
});
