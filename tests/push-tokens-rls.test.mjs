import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// Static security invariants for the push-tokens surface (migration 0006).
// Like subscribers-rls.test.mjs these need NO live database — they parse the SQL
// so the trust model can't silently regress: the device-token list must stay
// write-only (no anon read => not scrapable), all writes must go through
// SECURITY DEFINER RPCs with a pinned search_path, and the register RPC must
// validate the Expo token shape before inserting.

const root = process.cwd();
const sql = readFileSync(
  join(root, 'supabase', 'migrations', '0006_push_tokens.sql'),
  'utf-8'
);

describe('migration 0006 — push_tokens table', () => {
  it('creates the table (idempotently)', () => {
    expect(/create table if not exists push_tokens/i.test(sql)).toBe(true);
  });

  it('enables RLS on the table', () => {
    expect(
      /alter table push_tokens enable row level security/i.test(sql)
    ).toBe(true);
  });

  it('constrains platform and lang to known values', () => {
    expect(/platform[\s\S]*?check\s*\(\s*platform in \('ios', 'android', 'unknown'\)/i.test(sql)).toBe(true);
    expect(/lang[\s\S]*?check\s*\(\s*lang in \('en', 'ar', 'es'\)/i.test(sql)).toBe(true);
  });
});

describe('migration 0006 — push_tokens is write-only (cannot be scraped)', () => {
  // Isolate the table section (from its def up to the first function) so a
  // policy on some *other* object can't satisfy these by accident.
  const start = sql.search(/create table if not exists push_tokens/i);
  const end = sql.search(/create or replace function/i);
  const section = sql.slice(start, end);

  it('defines NO RLS policy at all on push_tokens (RPC + service_role only)', () => {
    // RLS is on (asserted above) but there are no anon/authenticated policies,
    // so direct PostgREST access (select/insert/update/delete) is denied; the
    // SECURITY DEFINER RPCs are the only write path and service_role the only
    // read path.
    expect(/create policy/i.test(section)).toBe(false);
  });

  it('has NO SELECT/UPDATE/DELETE grant in the table section', () => {
    expect(/for select/i.test(section)).toBe(false);
    expect(/for update/i.test(section)).toBe(false);
    expect(/for delete/i.test(section)).toBe(false);
  });
});

describe('migration 0006 — register_push_token RPC hardening', () => {
  it('is SECURITY DEFINER with a pinned search_path = public', () => {
    expect(/security definer/i.test(sql)).toBe(true);
    expect(/set search_path\s*=\s*public/i.test(sql)).toBe(true);
    expect(
      /security definer\s+set search_path\s*=\s*public/i.test(sql)
    ).toBe(true);
  });

  it('validates the Expo push token shape before inserting', () => {
    // Rejects (returns false) anything that is not an Expo(nent)PushToken[...].
    expect(/p_token is null/i.test(sql)).toBe(true);
    expect(/Expo\(nent\)\?PushToken/i.test(sql)).toBe(true);
  });

  it('upserts on token conflict (refresh, re-enable, bump updated_at)', () => {
    expect(/on conflict \(token\) do update/i.test(sql)).toBe(true);
    expect(/enabled\s*=\s*true/i.test(sql)).toBe(true);
    expect(/updated_at\s*=\s*now\(\)/i.test(sql)).toBe(true);
  });

  it('grants EXECUTE on both RPCs to anon (the public write path)', () => {
    expect(
      /grant execute on function public\.register_push_token\([^)]*\)\s+to[^;]*anon/i.test(sql)
    ).toBe(true);
    expect(
      /grant execute on function public\.set_push_enabled\([^)]*\)\s+to[^;]*anon/i.test(sql)
    ).toBe(true);
  });
});

describe('migration 0006 — set_push_enabled opt-out RPC', () => {
  it('updates enabled without deleting the row (opt-out is reversible)', () => {
    expect(/create or replace function public\.set_push_enabled/i.test(sql)).toBe(true);
    expect(/update public\.push_tokens/i.test(sql)).toBe(true);
    expect(/set enabled\s*=\s*p_enabled/i.test(sql)).toBe(true);
    // No DELETE anywhere in the migration — opt-out flips a flag, never drops.
    expect(/delete from/i.test(sql)).toBe(false);
  });
});
