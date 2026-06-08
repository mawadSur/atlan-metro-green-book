'use client';

import { useState } from 'react';
import { Eye, EyeOff, LogIn, ShieldAlert } from 'lucide-react';
import type { Lang } from '@/lib/types';
import { ta } from '@/i18n/admin';
import { signIn } from '@/lib/auth';

interface AdminGateProps {
  lang: Lang;
  /** True when a user is signed in but is NOT an admin. */
  signedIn: boolean;
}

/**
 * Access gate for the admin surface.
 * - Signed-out: a minimal inline sign-in form (kept within this lane).
 * - Signed-in non-admin: an access-denied panel.
 *
 * This is a UX gate only. The authoritative checks are RLS (is_admin())
 * and the server-side requireAdmin guard in the lane-V server actions.
 */
export function AdminGate({ lang, signedIn }: AdminGateProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(false);
    setLoading(true);
    try {
      await signIn(email, password);
      // The parent page subscribes to onAuthChange and will re-resolve the
      // role, swapping this gate for the dashboard if the user is an admin.
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  // Signed-in but not an admin → access denied.
  if (signedIn) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <div
          role="alert"
          className="flex flex-col items-center text-center gap-4"
        >
          <ShieldAlert size={48} className="text-red-500" aria-hidden="true" />
          <p className="text-stone-700">{ta.access_denied[lang]}</p>
        </div>
      </div>
    );
  }

  // Signed-out → inline sign-in.
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
      <p className="text-stone-600 text-sm mb-6">{ta.access_denied[lang]}</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="admin-email"
            className="block text-sm font-medium text-stone-900 mb-1"
          >
            {ta.email[lang]}
          </label>
          <input
            id="admin-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-11 px-3 border border-stone-300 rounded-lg focus:outline-none focus-visible:ring-2 ring-teal-600 transition-shadow motion-safe:duration-150"
          />
        </div>

        <div>
          <label
            htmlFor="admin-password"
            className="block text-sm font-medium text-stone-900 mb-1"
          >
            {ta.password[lang]}
          </label>
          <div className="relative">
            <input
              id="admin-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 px-3 pr-11 border border-stone-300 rounded-lg focus:outline-none focus-visible:ring-2 ring-teal-600 transition-shadow motion-safe:duration-150"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-stone-600 hover:text-stone-900 focus:outline-none focus-visible:ring-2 ring-teal-600 rounded transition-colors motion-safe:duration-150"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 bg-teal-700 hover:bg-emerald-800 text-white font-medium rounded-lg flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 ring-teal-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all motion-safe:duration-150"
        >
          {loading ? (
            ta.saving[lang]
          ) : (
            <>
              <LogIn size={20} />
              {lang === 'ar' ? 'تسجيل الدخول' : lang === 'es' ? 'Iniciar sesión' : 'Sign in'}
            </>
          )}
        </button>
      </form>

      {error && (
        <div role="alert" className="mt-4 text-sm text-red-600">
          {ta.error[lang]}
        </div>
      )}
    </div>
  );
}
