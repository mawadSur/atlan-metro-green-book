'use client';

import { useState } from 'react';
import { ArrowLeft, UserPlus, Mail, Eye, EyeOff } from 'lucide-react';
import type { Lang } from '@/lib/types';
import { tp } from '@/i18n/portal';
import { signUp } from '@/lib/auth';

interface SignUpFormProps {
  lang: Lang;
  onBack: () => void;
}

type State = 'idle' | 'submitting' | 'sent' | 'error';

export function SignUpForm({ lang, onBack }: SignUpFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [state, setState] = useState<State>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState('submitting');
    try {
      // We don't branch on the result: even an already-registered email returns
      // success (Supabase obfuscates it), so always land on the same
      // "check your inbox" screen to avoid leaking which emails exist.
      await signUp(email, password);
      setState('sent');
    } catch {
      setState('error');
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-teal-700 mb-4 focus:outline-none focus-visible:ring-2 ring-teal-600 rounded transition-colors motion-safe:duration-150"
      >
        <ArrowLeft size={16} />
        {tp.backToSignIn[lang]}
      </button>

      <h2 className="text-lg font-semibold text-stone-900 mb-1">{tp.signUpTitle[lang]}</h2>
      <p className="text-stone-600 text-sm mb-6">{tp.signUpSubtitle[lang]}</p>

      {state === 'sent' ? (
        <div role="status" aria-live="polite" className="flex items-start gap-2 text-sm text-green-700">
          <Mail size={20} className="shrink-0" />
          <span>{tp.signUpCheckEmail[lang]}</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="signup_email" className="block text-sm font-medium text-stone-900 mb-1">
              {tp.email[lang]}
            </label>
            <input
              id="signup_email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 px-3 border border-stone-300 rounded-lg focus:outline-none focus-visible:ring-2 ring-teal-600 transition-shadow motion-safe:duration-150"
            />
          </div>

          <div>
            <label htmlFor="signup_password" className="block text-sm font-medium text-stone-900 mb-1">
              {tp.password[lang]}
            </label>
            <div className="relative">
              <input
                id="signup_password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby="signup_password_hint"
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
            <p id="signup_password_hint" className="mt-1 text-xs text-stone-500">{tp.passwordHint[lang]}</p>
          </div>

          <button
            type="submit"
            disabled={state === 'submitting'}
            className="w-full h-11 bg-teal-700 hover:bg-emerald-800 text-white font-medium rounded-lg flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 ring-teal-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all motion-safe:duration-150"
          >
            {state === 'submitting' ? (
              tp.creatingAccount[lang]
            ) : (
              <>
                <UserPlus size={20} />
                {tp.createAccount[lang]}
              </>
            )}
          </button>

          {state === 'error' && (
            <div role="alert" aria-live="polite" className="text-sm text-red-600">
              {tp.signUpError[lang]}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
