// Tests for web/src/lib/subscribe.ts (server action).
// subscribeEmail is a 'use server' function that calls next/headers and
// @supabase/supabase-js. Both are mocked via vi.mock here; the actual network
// is never touched. The suite verifies the business logic layer only.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- module mocks (must be hoisted before any imports) -------------------

function headersMock() {
  return {
    headers: vi.fn().mockResolvedValue({
      get: vi.fn((name) => (name === 'x-forwarded-for' ? '203.0.113.5' : null)),
    }),
  };
}

vi.mock('next/headers', headersMock);
vi.mock('../web/node_modules/next/headers.js', headersMock);

// Supabase mock — each test configures rpc's return value via the factory.
const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }));
function supabaseMock() {
  return {
    createClient: () => ({
      rpc: mockRpc,
    }),
  };
}

vi.mock('@supabase/supabase-js', supabaseMock);
vi.mock('../web/node_modules/@supabase/supabase-js/dist/index.cjs', supabaseMock);
vi.mock('../web/node_modules/@supabase/supabase-js/dist/index.mjs', supabaseMock);

// Provide the env vars the module reads at import time.
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

const { subscribeEmail } = await import('../web/src/lib/subscribe.ts');

// Helper: build a minimal FormData-like object.
function fd(fields = {}) {
  return {
    get: (key) => fields[key] ?? null,
  };
}

// --------------------------------------------------------------------------

describe('subscribeEmail — honeypot', () => {
  it('silently returns ok:true when the honeypot field is filled (bot trap)', async () => {
    const result = await subscribeEmail(null, fd({ company: 'bot was here', email: 'bot@evil.com' }));
    expect(result.ok).toBe(true);
    // Must NOT have called the DB.
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

describe('subscribeEmail — email validation', () => {
  beforeEach(() => mockRpc.mockReset());

  it('returns reason:"invalid" for an empty email', async () => {
    const result = await subscribeEmail(null, fd({ email: '' }));
    expect(result).toEqual({ ok: false, reason: 'invalid' });
  });

  it('returns reason:"invalid" for a malformed email', async () => {
    const result = await subscribeEmail(null, fd({ email: 'not-an-email' }));
    expect(result).toEqual({ ok: false, reason: 'invalid' });
  });

  it('trims whitespace before validation', async () => {
    // A valid email with surrounding spaces should NOT return invalid.
    mockRpc.mockResolvedValueOnce({ data: true, error: null });
    const result = await subscribeEmail(null, fd({ email: '  fan@example.com  ' }));
    // The trimmed email passes validation and reaches the DB.
    expect(result.ok).toBe(true);
  });
});

describe('subscribeEmail — DB success path', () => {
  beforeEach(() => mockRpc.mockReset());

  it('returns ok:true when the RPC returns true', async () => {
    mockRpc.mockResolvedValueOnce({ data: true, error: null });
    const result = await subscribeEmail(null, fd({ email: 'fan@worldcup.example', audience: 'visitor' }));
    expect(result).toEqual({ ok: true });
  });

  it('passes utm_source to the RPC when provided (capped at 128 chars)', async () => {
    mockRpc.mockResolvedValueOnce({ data: true, error: null });
    await subscribeEmail(null, fd({ email: 'f@x.co', utm_source: 'qr-t1' }));
    expect(mockRpc).toHaveBeenCalledWith('subscribe_email', expect.objectContaining({ p_utm: 'qr-t1' }));
  });

  it('sends null utm when utm_source is absent', async () => {
    mockRpc.mockResolvedValueOnce({ data: true, error: null });
    await subscribeEmail(null, fd({ email: 'f@x.co' }));
    expect(mockRpc).toHaveBeenCalledWith('subscribe_email', expect.objectContaining({ p_utm: null }));
  });

  it('normalizes unknown audience to "visitor"', async () => {
    mockRpc.mockResolvedValueOnce({ data: true, error: null });
    await subscribeEmail(null, fd({ email: 'f@x.co', audience: 'alien' }));
    expect(mockRpc).toHaveBeenCalledWith('subscribe_email', expect.objectContaining({ p_audience: 'visitor' }));
  });

  it('accepts "local" audience and forwards it unchanged', async () => {
    mockRpc.mockResolvedValueOnce({ data: true, error: null });
    await subscribeEmail(null, fd({ email: 'f@x.co', audience: 'local' }));
    expect(mockRpc).toHaveBeenCalledWith('subscribe_email', expect.objectContaining({ p_audience: 'local' }));
  });
});

describe('subscribeEmail — DB failure paths', () => {
  beforeEach(() => mockRpc.mockReset());

  it('returns reason:"ratelimited" when RPC returns false (rate-limited by DB)', async () => {
    mockRpc.mockResolvedValueOnce({ data: false, error: null });
    const result = await subscribeEmail(null, fd({ email: 'f@x.co' }));
    expect(result).toEqual({ ok: false, reason: 'ratelimited' });
  });

  it('returns reason:"error" when RPC returns a Supabase error object', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'DB down' } });
    const result = await subscribeEmail(null, fd({ email: 'f@x.co' }));
    expect(result).toEqual({ ok: false, reason: 'error' });
  });

  it('returns reason:"error" when RPC throws (network failure)', async () => {
    mockRpc.mockRejectedValueOnce(new Error('network timeout'));
    const result = await subscribeEmail(null, fd({ email: 'f@x.co' }));
    expect(result).toEqual({ ok: false, reason: 'error' });
  });

  it('returns reason:"error" when Supabase env vars are absent', async () => {
    // Test the missing-creds guard by temporarily clearing the env.
    const savedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const savedKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Re-import to pick up the missing env vars.
    vi.resetModules();
    const { subscribeEmail: fresh } = await import('../web/src/lib/subscribe.ts?no-creds');
    const result = await fresh(null, fd({ email: 'f@x.co' }));
    expect(result).toEqual({ ok: false, reason: 'error' });

    process.env.NEXT_PUBLIC_SUPABASE_URL = savedUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = savedKey;
  });
});
