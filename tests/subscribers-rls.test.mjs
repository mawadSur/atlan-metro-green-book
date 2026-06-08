import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// Static security invariants for the email-subscribers surface (migration 0005).
// Like admin-security.test.mjs these need NO live database — they parse the SQL
// so the trust model can't silently regress: the subscriber list must stay
// write-only (no anon read => not scrapable), the rate-limit RPC must stay
// SECURITY DEFINER with a pinned search_path, and the per-IP throttle must
// reference the hashed-IP log over a 1-hour window with a count threshold.

const root = process.cwd();
const sql = readFileSync(
  join(root, 'supabase', 'migrations', '0005_subscribers.sql'),
  'utf-8'
);

describe('migration 0005 — subscribers + signups_log tables', () => {
  it('creates both tables (idempotently)', () => {
    expect(/create table if not exists subscribers/i.test(sql)).toBe(true);
    expect(/create table if not exists signups_log/i.test(sql)).toBe(true);
  });

  it('enables RLS on both tables', () => {
    expect(
      /alter table subscribers enable row level security/i.test(sql)
    ).toBe(true);
    expect(
      /alter table signups_log enable row level security/i.test(sql)
    ).toBe(true);
  });

  it('subscribers.audience is constrained to local/visitor', () => {
    expect(/audience[\s\S]*?check\s*\(\s*audience in \('local', 'visitor'\)/i.test(sql)).toBe(true);
  });
});

describe('migration 0005 — subscribers is write-only (cannot be scraped)', () => {
  it('grants an INSERT policy to anon AND authenticated', () => {
    // anon INSERT
    expect(
      /create policy[^;]*on subscribers\s+for insert to anon/i.test(sql)
    ).toBe(true);
    // authenticated INSERT
    expect(
      /create policy[^;]*on subscribers\s+for insert to authenticated/i.test(
        sql
      )
    ).toBe(true);
  });

  it('has NO SELECT policy on subscribers (list cannot be read back out)', () => {
    // Isolate the subscribers section (from its table def up to signups_log)
    // so a SELECT policy on some *other* table can't satisfy this by accident.
    const start = sql.search(/create table if not exists subscribers/i);
    const end = sql.search(/create table if not exists signups_log/i);
    const subscribersSection = sql.slice(start, end);

    // Any policy block in the subscribers section must NOT be a SELECT policy,
    // and there must be no anon/authenticated SELECT grant either.
    expect(/on subscribers\s+for select/i.test(subscribersSection)).toBe(false);
    expect(/for select/i.test(subscribersSection)).toBe(false);
    // Defense: no UPDATE/DELETE policy either (write-once, append-only).
    expect(/on subscribers\s+for update/i.test(subscribersSection)).toBe(false);
    expect(/on subscribers\s+for delete/i.test(subscribersSection)).toBe(false);
  });

  it('signups_log has NO anon/authenticated policy (RPC + service_role only)', () => {
    const start = sql.search(/create table if not exists signups_log/i);
    const end = sql.search(/create or replace function/i);
    const logSection = sql.slice(start, end);
    // RLS is on (asserted above) but the section defines no policies at all,
    // so anon/authenticated get zero access to the hashed-IP ledger.
    expect(/create policy/i.test(logSection)).toBe(false);
  });
});

describe('migration 0005 — subscribe_email RPC hardening', () => {
  it('is SECURITY DEFINER with a pinned search_path = public', () => {
    expect(/security definer/i.test(sql)).toBe(true);
    expect(/set search_path\s*=\s*public/i.test(sql)).toBe(true);
    // Both on the function (paranoia: the only DEFINER in this migration).
    expect(
      /security definer\s+set search_path\s*=\s*public/i.test(sql)
    ).toBe(true);
  });

  it('grants EXECUTE on the RPC to anon (the public write path)', () => {
    expect(
      /grant execute on function public\.subscribe_email\([^)]*\)\s+to[^;]*anon/i.test(
        sql
      )
    ).toBe(true);
  });

  it('validates basic email shape inside the function (defense in depth)', () => {
    // The RPC rejects (returns false) on a malformed email before inserting.
    expect(/p_email is null or p_email\s*!~/i.test(sql)).toBe(true);
  });

  it('enforces a per-IP rate limit: signups_log, 1-hour window, count threshold', () => {
    // Rate-limit logic references the hashed-IP ledger...
    expect(/from\s+public\.signups_log/i.test(sql)).toBe(true);
    // ...over a trailing 1-hour window...
    expect(/now\(\)\s*-\s*interval '1 hour'/i.test(sql)).toBe(true);
    // ...with a >=5 threshold that returns false.
    expect(/v_recent\s*>=\s*5/i.test(sql)).toBe(true);
    expect(/count\(\*\)\s+into\s+v_recent/i.test(sql)).toBe(true);
  });

  it('writes both subscribers and signups_log atomically in one transaction', () => {
    // Single plpgsql body => both inserts run (or roll back) together.
    expect(/insert into public\.subscribers/i.test(sql)).toBe(true);
    expect(/insert into public\.signups_log/i.test(sql)).toBe(true);
  });
});
