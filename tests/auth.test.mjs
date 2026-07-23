// Tests for web/src/lib/auth.ts
// All Supabase calls are mocked — no network is touched.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockUpdateUser = vi.fn();
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();

vi.mock('../web/src/lib/supabase.ts', () => ({
  supabase: {
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signOut: mockSignOut,
      resetPasswordForEmail: mockResetPasswordForEmail,
      updateUser: mockUpdateUser,
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
  },
}));

const { signIn, signUp, signOut, requestPasswordReset, updatePassword, getSession, onAuthChange } =
  await import('../web/src/lib/auth.ts');

beforeEach(() => vi.clearAllMocks());

// ---------------------------------------------------------------------------
// signIn
// ---------------------------------------------------------------------------

describe('signIn', () => {
  it('returns data on success', async () => {
    const data = { session: { access_token: 'tok' }, user: { id: 'u1' } };
    mockSignInWithPassword.mockResolvedValueOnce({ data, error: null });
    const result = await signIn('user@example.com', 'password123');
    expect(result).toBe(data);
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
    });
  });

  it('throws the Supabase error on failure', async () => {
    const authError = new Error('Invalid credentials');
    mockSignInWithPassword.mockResolvedValueOnce({ data: null, error: authError });
    await expect(signIn('bad@example.com', 'wrong')).rejects.toThrow('Invalid credentials');
  });
});

// ---------------------------------------------------------------------------
// signUp
// ---------------------------------------------------------------------------

describe('signUp — email confirmation required', () => {
  it('returns needsConfirmation:true when no session is issued (normal path)', async () => {
    mockSignUp.mockResolvedValueOnce({
      data: { session: null, user: { id: 'u2', identities: [{ id: 'i1' }] } },
      error: null,
    });
    const result = await signUp('new@example.com', 'Password1!');
    expect(result.needsConfirmation).toBe(true);
    expect(result.session).toBeNull();
  });

  it('returns needsConfirmation:false when a session is immediately issued', async () => {
    const session = { access_token: 'tok2' };
    mockSignUp.mockResolvedValueOnce({
      data: { session, user: { id: 'u3' } },
      error: null,
    });
    const result = await signUp('auto@example.com', 'Password1!');
    expect(result.needsConfirmation).toBe(false);
    expect(result.session).toBe(session);
  });

  it('throws the Supabase error on failure', async () => {
    const authError = new Error('User already registered');
    mockSignUp.mockResolvedValueOnce({ data: null, error: authError });
    await expect(signUp('exists@example.com', 'pw')).rejects.toThrow('User already registered');
  });

  it('passes emailRedirectTo when window.location.origin is available', async () => {
    vi.stubGlobal('window', { location: { origin: 'https://atlan-green-book.vercel.app' } });
    mockSignUp.mockResolvedValueOnce({
      data: { session: null, user: { id: 'u4' } },
      error: null,
    });
    await signUp('redir@example.com', 'pw');
    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          emailRedirectTo: 'https://atlan-green-book.vercel.app/portal',
        }),
      })
    );
    vi.unstubAllGlobals();
  });
});

// ---------------------------------------------------------------------------
// signOut
// ---------------------------------------------------------------------------

describe('signOut', () => {
  it('resolves without returning a value on success', async () => {
    mockSignOut.mockResolvedValueOnce({ error: null });
    await expect(signOut()).resolves.toBeUndefined();
  });

  it('throws the Supabase error on failure', async () => {
    const authError = new Error('Session not found');
    mockSignOut.mockResolvedValueOnce({ error: authError });
    await expect(signOut()).rejects.toThrow('Session not found');
  });
});

// ---------------------------------------------------------------------------
// requestPasswordReset
// ---------------------------------------------------------------------------

describe('requestPasswordReset', () => {
  it('resolves on success', async () => {
    mockResetPasswordForEmail.mockResolvedValueOnce({ error: null });
    await expect(requestPasswordReset('user@example.com')).resolves.toBeUndefined();
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
      'user@example.com',
      expect.any(Object)
    );
  });

  it('throws on failure', async () => {
    mockResetPasswordForEmail.mockResolvedValueOnce({ error: new Error('Rate limited') });
    await expect(requestPasswordReset('x@x.co')).rejects.toThrow('Rate limited');
  });
});

// ---------------------------------------------------------------------------
// updatePassword
// ---------------------------------------------------------------------------

describe('updatePassword', () => {
  it('resolves on success', async () => {
    mockUpdateUser.mockResolvedValueOnce({ error: null });
    await expect(updatePassword('NewP@ss1')).resolves.toBeUndefined();
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'NewP@ss1' });
  });

  it('throws on failure', async () => {
    mockUpdateUser.mockResolvedValueOnce({ error: new Error('Weak password') });
    await expect(updatePassword('123')).rejects.toThrow('Weak password');
  });
});

// ---------------------------------------------------------------------------
// getSession
// ---------------------------------------------------------------------------

describe('getSession', () => {
  it('returns the session when authenticated', async () => {
    const session = { access_token: 'abc', user: { id: 'u5' } };
    mockGetSession.mockResolvedValueOnce({ data: { session }, error: null });
    const result = await getSession();
    expect(result).toBe(session);
  });

  it('returns null when unauthenticated', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    const result = await getSession();
    expect(result).toBeNull();
  });

  it('throws on Supabase error', async () => {
    mockGetSession.mockResolvedValueOnce({ data: null, error: new Error('JWT expired') });
    await expect(getSession()).rejects.toThrow('JWT expired');
  });
});

// ---------------------------------------------------------------------------
// onAuthChange
// ---------------------------------------------------------------------------

describe('onAuthChange', () => {
  it('registers the callback and returns an unsubscribe function', () => {
    const unsubscribe = vi.fn();
    mockOnAuthStateChange.mockReturnValueOnce({
      data: { subscription: { unsubscribe } },
    });
    const callback = vi.fn();
    const cleanup = onAuthChange(callback);
    expect(mockOnAuthStateChange).toHaveBeenCalledWith(callback);
    expect(typeof cleanup).toBe('function');
    cleanup();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
