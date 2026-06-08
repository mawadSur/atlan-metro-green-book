'use client';

import { useState } from 'react';
import { KeyRound, Check, Eye, EyeOff } from 'lucide-react';
import type { Lang } from '@/lib/types';
import { tp } from '@/i18n/portal';
import { updatePassword } from '@/lib/auth';

interface ResetPasswordFormProps {
  lang: Lang;
  onDone: () => void;
}

type State = 'idle' | 'saving' | 'done' | 'error';

export function ResetPasswordForm({ lang, onDone }: ResetPasswordFormProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [state, setState] = useState<State>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState('saving');
    try {
      await updatePassword(password);
      setState('done');
    } catch {
      setState('error');
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-stone-900 mb-6">{tp.setNewPassword[lang]}</h2>

      {state === 'done' ? (
        <div className="flex flex-col items-center text-center gap-4">
          <Check size={48} className="text-green-600" />
          <p role="status" aria-live="polite" className="text-stone-700">{tp.passwordUpdated[lang]}</p>
          <button
            onClick={onDone}
            className="h-11 px-4 bg-teal-700 hover:bg-emerald-800 text-white font-medium rounded-lg cursor-pointer focus:outline-none focus-visible:ring-2 ring-teal-600 active:scale-[0.98] transition-all motion-safe:duration-150"
          >
            {tp.yourLocation[lang]}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="new_password" className="block text-sm font-medium text-stone-900 mb-1">
              {tp.newPassword[lang]}
            </label>
            <div className="relative">
              <input
                id="new_password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={6}
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
            disabled={state === 'saving'}
            className="w-full h-11 bg-teal-700 hover:bg-emerald-800 text-white font-medium rounded-lg flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 ring-teal-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all motion-safe:duration-150"
          >
            {state === 'saving' ? (
              tp.updatingPassword[lang]
            ) : (
              <>
                <KeyRound size={20} />
                {tp.updatePassword[lang]}
              </>
            )}
          </button>

          {state === 'error' && (
            <div role="alert" aria-live="polite" className="text-sm text-red-600">
              {tp.passwordUpdateError[lang]}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
