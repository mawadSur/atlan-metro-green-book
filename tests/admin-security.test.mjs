import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

// Static security invariants for the admin/business portal.
// These need NO live database — they parse the migrations and source so the
// trust model can't silently regress (see migration 0001's column REVOKE that
// once silently failed in prod, leaving halal_status owner-writable).

const root = process.cwd();
const read = (...p) => readFileSync(join(root, ...p), 'utf-8');

describe('migration 0002 — locations column write protection', () => {
  const sql = read('supabase', 'migrations', '0002_write_protection_and_roles.sql');
  const grant = sql.match(/GRANT UPDATE\s*\(([^)]*)\)\s*ON locations TO authenticated/i);

  it('grants UPDATE on locations to authenticated for a scoped column set', () => {
    expect(grant).not.toBeNull();
  });

  it('NEVER grants owners write access to halal provenance columns', () => {
    const cols = grant[1];
    for (const forbidden of ['halal_status', 'verified_by', 'verified_at', 'halal_certified', 'claimed_by']) {
      expect(cols.includes(forbidden)).toBe(false);
    }
  });

  it('does grant the owner-safe columns the portal editor edits', () => {
    const cols = grant[1];
    for (const allowed of ['name_en', 'address', 'phone', 'hours_en', 'discount_code', 'image_url']) {
      expect(cols.includes(allowed)).toBe(true);
    }
  });
});

describe('migration 0003 — claims + audit RLS', () => {
  // Resolve the 0003 migration regardless of exact filename.
  const migDir = join(root, 'supabase', 'migrations');
  const file = readdirSync(migDir).find((f) => /^0003_/.test(f));
  const sql = readFileSync(join(migDir, file), 'utf-8');

  it('creates claim_requests and audit_log with RLS enabled', () => {
    expect(/create table if not exists claim_requests/i.test(sql)).toBe(true);
    expect(/create table if not exists audit_log/i.test(sql)).toBe(true);
    expect(/alter table claim_requests enable row level security/i.test(sql)).toBe(true);
    expect(/alter table audit_log enable row level security/i.test(sql)).toBe(true);
  });

  it('scopes claim_requests inserts to the authenticated requester (no IDOR)', () => {
    expect(/auth\.uid\(\)\s*=\s*requester_uid/i.test(sql)).toBe(true);
  });

  it('gates claim_requests updates and audit_log reads behind is_admin()', () => {
    expect(/is_admin\(\)/i.test(sql)).toBe(true);
  });

  it('audit_log has no permissive INSERT/UPDATE/DELETE policy (service_role only)', () => {
    // Isolate the audit_log section (from its table definition onward) and
    // assert the only policy is the admin SELECT.
    const auditSection = sql.slice(sql.search(/create table if not exists audit_log/i));
    expect(/for\s+insert/i.test(auditSection)).toBe(false);
    expect(/for\s+update/i.test(auditSection)).toBe(false);
    expect(/for\s+delete/i.test(auditSection)).toBe(false);
  });
});

describe('admin server surface — service-role containment', () => {
  const adminDir = join(root, 'web', 'src', 'lib', 'admin');
  const files = existsSync(adminDir) ? readdirSync(adminDir).filter((f) => f.endsWith('.ts')) : [];

  it('no source file exposes the service role key under a NEXT_PUBLIC_ prefix', () => {
    const webSrc = join(root, 'web', 'src');
    const offenders = [];
    const walk = (dir) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(entry.name)) {
          const txt = readFileSync(full, 'utf-8');
          if (/NEXT_PUBLIC[A-Z_]*SERVICE[A-Z_]*/.test(txt)) offenders.push(full);
        }
      }
    };
    walk(webSrc);
    expect(offenders).toEqual([]);
  });

  it('any admin module reading the service role key is marked server-only', () => {
    for (const f of files) {
      const txt = readFileSync(join(adminDir, f), 'utf-8');
      if (txt.includes('SUPABASE_SERVICE_ROLE_KEY')) {
        expect(/import ['"]server-only['"]/.test(txt)).toBe(true);
      }
    }
  });

  it('every "use server" action module re-verifies admin server-side via requireAdmin', () => {
    for (const f of files) {
      const txt = readFileSync(join(adminDir, f), 'utf-8');
      if (/^\s*['"]use server['"]/.test(txt)) {
        expect(txt.includes('requireAdmin')).toBe(true);
      }
    }
  });
});

describe('business portal — owner cannot self-certify halal', () => {
  it('LocationEditor never reads or writes halal provenance columns', () => {
    const editor = read('web', 'src', 'app', 'portal', 'LocationEditor.tsx');
    expect(/['"]halal_status['"]/.test(editor)).toBe(false);
    expect(/['"]verified_by['"]/.test(editor)).toBe(false);
    expect(/['"]verified_at['"]/.test(editor)).toBe(false);
  });

  it('portal supabase client no longer hard-disables session persistence', () => {
    const sb = read('web', 'src', 'lib', 'supabase.ts');
    expect(/persistSession:\s*false/.test(sb)).toBe(false);
  });
});
