'use client';

// Email capture for the daily match-day halal + prayer guide.
//
// Wires the `subscribeEmail` server action via React 19's useActionState
// (signature: (prevState, formData) => Promise<SubscribeResult>). Includes:
//  - a hidden honeypot input named 'company' (off-screen, aria-hidden,
//    tabindex=-1) that bots fill and humans never see;
//  - a local/visitor audience toggle posted as the `audience` field;
//  - the UTM source captured client-side and posted as `utm_source`;
//  - localized consent text + success / error messaging.

import { useActionState, useEffect, useState } from 'react';
import { Mail, Check } from 'lucide-react';
import type { Lang } from '@/lib/types';
import { m } from '@/i18n/match';
import { HONEYPOT_FIELD } from '@/lib/email-validate';
import { subscribeEmail, type SubscribeResult } from '@/lib/subscribe';
import { trackEvent } from '@/lib/analytics';
import { useUtmSource } from './useClient';

interface EmailCaptureProps {
  slug: string;
  lang: Lang;
}

type Audience = 'local' | 'visitor';

// Local submit verb (not in the shared i18n dict).
const SUBMIT: Record<Lang, string> = {
  en: 'Get the guide',
  ar: 'احصل على الدليل',
  es: 'Recibir la guía',
};

function errorText(reason: SubscribeResult['reason'], lang: Lang): string {
  if (reason === 'invalid') return m.email_error_invalid[lang];
  if (reason === 'ratelimited') return m.email_error_ratelimited[lang];
  return m.email_error_generic[lang];
}

export default function EmailCapture({ slug, lang }: EmailCaptureProps) {
  const [state, formAction, pending] = useActionState<SubscribeResult | null, FormData>(
    subscribeEmail,
    null
  );
  const [audience, setAudience] = useState<Audience>('visitor');
  // UTM is only knowable in the browser; useSyncExternalStore keeps the server
  // HTML ('') matching the first client render, then fills in after hydration.
  const utmSource = useUtmSource();

  // Fire a conversion event exactly once when the action reports success.
  useEffect(() => {
    if (state?.ok) trackEvent('email_subscribe', { match: slug, audience });
  }, [state?.ok, slug, audience]);

  if (state?.ok) {
    return (
      <div
        className="rounded-2xl border border-teal-200 bg-teal-50 p-5 text-center"
        role="status"
        aria-live="polite"
      >
        <Check size={28} className="mx-auto text-teal-700" aria-hidden="true" />
        <p className="mt-2 font-semibold text-emerald-900">{m.email_success[lang]}</p>
      </div>
    );
  }

  const failed = state && !state.ok;

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-stone-200 bg-white p-5 space-y-4"
    >
      <div className="flex items-start gap-2">
        <Mail size={20} className="mt-0.5 shrink-0 text-teal-700" aria-hidden="true" />
        <label htmlFor="match_email" className="font-semibold text-stone-900">
          {m.email_cta[lang]}
        </label>
      </div>

      {/* Audience toggle — posted as `audience`. */}
      <div className="flex gap-2" role="group" aria-label={m.email_cta[lang]}>
        {(['visitor', 'local'] as Audience[]).map((a) => {
          const active = audience === a;
          return (
            <button
              key={a}
              type="button"
              onClick={() => setAudience(a)}
              aria-pressed={active}
              className={`min-h-[44px] flex-1 rounded-xl border px-3 text-sm font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 motion-safe:transition-colors ${
                active
                  ? 'border-teal-600 bg-teal-50 text-emerald-900'
                  : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
              }`}
            >
              {a === 'local' ? m.email_audience_local[lang] : m.email_audience_visitor[lang]}
            </button>
          );
        })}
      </div>
      <input type="hidden" name="audience" value={audience} />
      <input type="hidden" name="utm_source" value={utmSource} />

      {/* Honeypot: off-screen, hidden from AT + keyboard. Bots fill it; we drop. */}
      <div
        aria-hidden="true"
        className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden"
      >
        <label htmlFor={HONEYPOT_FIELD}>Company</label>
        <input
          id={HONEYPOT_FIELD}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="match_email"
          name="email"
          type="email"
          required
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          placeholder={m.email_placeholder[lang]}
          aria-describedby="match_email_consent match_email_status"
          className="min-h-[44px] flex-1 rounded-xl border border-stone-300 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 motion-safe:transition-shadow"
        />
        <button
          type="submit"
          disabled={pending}
          className="min-h-[44px] rounded-xl bg-teal-700 px-5 font-medium text-white hover:bg-emerald-800 active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed motion-safe:transition-all motion-safe:duration-150"
        >
          {pending ? '…' : SUBMIT[lang]}
        </button>
      </div>

      <p id="match_email_status" aria-live="polite" className="min-h-[1.25rem]">
        {failed && (
          <span role="alert" className="text-sm text-rose-700">
            {errorText(state?.reason, lang)}
          </span>
        )}
      </p>

      <p id="match_email_consent" className="text-xs leading-relaxed text-stone-500">
        {m.email_consent[lang]}
      </p>
    </form>
  );
}
