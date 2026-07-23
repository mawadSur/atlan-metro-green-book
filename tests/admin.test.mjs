// Tests for web/src/lib/admin/service.ts and actions.ts
// All Supabase calls are mocked — no network is touched.
// IMPORTANT: admin/service.ts imports 'server-only' at the top — vitest must
// mock that module or the import will throw in a non-Next.js test environment.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// server-only throws unless it detects a Next.js RSC environment.
vi.mock('server-only', () => ({}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn();
const mockListUsers = vi.fn();
const mockListProfilesQuery = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      admin: { listUsers: mockListUsers },
      getUser: mockGetUser,
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
        // For listUsers — profiles select returns mockListProfilesQuery
        then: mockListProfilesQuery,
      })),
    })),
  })),
}));

// ---------------------------------------------------------------------------
// getServiceRoleClient
// ---------------------------------------------------------------------------

describe('getServiceRoleClient — env vars', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it('throws when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    const { getServiceRoleClient } = await import('../web/src/lib/admin/service.ts?no-key');
    expect(() => getServiceRoleClient()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('throws when NEXT_PUBLIC_SUPABASE_URL is missing', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key-test';
    const { getServiceRoleClient } = await import('../web/src/lib/admin/service.ts?no-url');
    expect(() => getServiceRoleClient()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it('returns a client when both env vars are present', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key-test';
    const { getServiceRoleClient } = await import('../web/src/lib/admin/service.ts?both');
    expect(() => getServiceRoleClient()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// requireAdmin
// ---------------------------------------------------------------------------

describe('requireAdmin — token validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key-test';
  });

  it('throws "Invalid or expired access token" when getUser returns an error', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'JWT expired' },
    });
    const { requireAdmin } = await import('../web/src/lib/admin/service.ts?ra-err');
    await expect(requireAdmin('bad-token')).rejects.toThrow(/invalid|expired/i);
  });

  it('throws "Invalid or expired access token" when user is null (no error, just no user)', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    const { requireAdmin } = await import('../web/src/lib/admin/service.ts?ra-null');
    await expect(requireAdmin('ghost-token')).rejects.toThrow(/invalid|expired/i);
  });

  it.todo('throws "Forbidden: admin role required" when user role is "user"');
  // Profile lookup returns role:'user' → expect Forbidden throw.
  // Requires the full from().select().eq().single() chain to be mockable cleanly.
  // Set up the mock chain in beforeEach; this is a minor wiring exercise.

  it.todo('resolves (returns user id) when user is admin');
  // Profile lookup returns role:'admin' → no throw, returns user.id string.
});

// ---------------------------------------------------------------------------
// listUsers (action) — integration of requireAdmin + auth.admin.listUsers
// ---------------------------------------------------------------------------

describe('listUsers action', () => {
  it.todo('throws when the caller is not an admin');
  // mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
  // const { listUsers } = await import('../web/src/lib/admin/actions.ts');
  // await expect(listUsers('bad-token')).rejects.toThrow();

  it.todo('returns mapped AdminUser array on success');
  // Full happy-path: requireAdmin passes, listUsers returns [{id, email, banned_until}],
  // profiles returns [{id, role:'admin'}] → expect [{id, email, role:'admin', disabled:false}]

  it.todo('throws when auth.admin.listUsers returns an error');
  // requireAdmin passes, listUsers returns { data:{users:null}, error:{message:'DB error'} }
  // → expect throw 'Failed to list users: DB error'

  it.todo('maps banned_until (non-null) to disabled:true');
  // User has banned_until: '2026-12-31T00:00:00Z' → disabled: true
});
