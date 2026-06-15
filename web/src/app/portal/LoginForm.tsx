'use client';

import { useState } from 'react';
import { Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
import type { Lang } from '@/lib/types';
import { tp } from '@/i18n/portal';
import { signIn } from '@/lib/auth';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { SignUpForm } from './SignUpForm';

interface LoginFormProps {
  lang: Lang;
  onSignedIn: () => void;
}

export function LoginForm({ lang, onSignedIn }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [signup, setSignup] = useState(false);

  if (forgot) {
    return <ForgotPasswordForm lang={lang} onBack={() => setForgot(false)} />;
  }

  if (signup) {
    return <SignUpForm lang={lang} onBack={() => setSignup(false)} />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(false);
    setLoading(true);
    try {
      await signIn(email, password);
      onSignedIn();
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
      <p className="text-stone-600 text-sm mb-6">{tp.portal_subtitle[lang]}</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-stone-900 mb-1">
            {tp.email[lang]}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-11 px-3 border border-stone-300 rounded-lg focus:outline-none focus-visible:ring-2 ring-teal-600 transition-shadow motion-safe:duration-150"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-stone-900 mb-1">
            {tp.password[lang]}
          </label>
          <div className="relative">
            <input
              id="password"
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
              aria-label={showPassword ? tp.hidePassword[lang] : tp.showPassword[lang]}
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
            tp.signingIn[lang]
          ) : (
            <>
              <LogIn size={20} />
              {tp.signIn[lang]}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => setForgot(true)}
          className="w-full text-center text-sm text-stone-600 hover:text-teal-700 focus:outline-none focus-visible:ring-2 ring-teal-600 rounded transition-colors motion-safe:duration-150"
        >
          {tp.forgotPassword[lang]}
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-stone-200">
        <button
          type="button"
          onClick={() => setSignup(true)}
          className="w-full h-11 flex items-center justify-center gap-2 text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg cursor-pointer focus:outline-none focus-visible:ring-2 ring-teal-600 active:scale-[0.98] transition-all motion-safe:duration-150"
        >
          <UserPlus size={18} />
          {tp.noAccount[lang]}
        </button>
      </div>

      {error && (
        <div role="alert" className="mt-4 text-sm text-red-600">
          {tp.authError[lang]}
        </div>
      )}
    </div>
  );
}
