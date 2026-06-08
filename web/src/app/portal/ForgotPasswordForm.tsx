'use client';

import { useState } from 'react';
import { ArrowLeft, Mail, Check } from 'lucide-react';
import type { Lang } from '@/lib/types';
import { tp } from '@/i18n/portal';
import { requestPasswordReset } from '@/lib/auth';

interface ForgotPasswordFormProps {
  lang: Lang;
  onBack: () => void;
}

type State = 'idle' | 'sending' | 'sent' | 'error';

export function ForgotPasswordForm({ lang, onBack }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    try {
      await requestPasswordReset(email);
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

      <h2 className="text-lg font-semibold text-stone-900 mb-1">{tp.resetTitle[lang]}</h2>
      <p className="text-stone-600 text-sm mb-6">{tp.resetSubtitle[lang]}</p>

      {state === 'sent' ? (
        <div role="status" aria-live="polite" className="flex items-start gap-2 text-sm text-green-700">
          <Check size={20} className="shrink-0" />
          <span>{tp.resetSent[lang]}</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reset_email" className="block text-sm font-medium text-stone-900 mb-1">
              {tp.email[lang]}
            </label>
            <input
              id="reset_email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 px-3 border border-stone-300 rounded-lg focus:outline-none focus-visible:ring-2 ring-teal-600 transition-shadow motion-safe:duration-150"
            />
          </div>

          <button
            type="submit"
            disabled={state === 'sending'}
            className="w-full h-11 bg-teal-700 hover:bg-emerald-800 text-white font-medium rounded-lg flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 ring-teal-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all motion-safe:duration-150"
          >
            {state === 'sending' ? (
              tp.sendingResetLink[lang]
            ) : (
              <>
                <Mail size={20} />
                {tp.sendResetLink[lang]}
              </>
            )}
          </button>

          {state === 'error' && (
            <div role="alert" aria-live="polite" className="text-sm text-red-600">
              {tp.resetError[lang]}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
