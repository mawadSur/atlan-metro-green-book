'use client';

// "Share my plan" — the second viral surface (Feature 3 / T8).
//
// Reads the no-login saved set, encodes it into a base64url ?saved=<token> on
// the /plan route, and shares that link via the Web Share API (copy-link
// fallback on desktop). Only renders once the visitor has saved ≥1 place — an
// empty plan isn't worth sharing. Hydration-safe: server snapshot is an empty
// count (matches server HTML), real count flows in after hydration, so the
// button simply isn't in the initial SSR/first-client render and appears once
// the store resolves — no mismatch because both server and first client agree
// the count is 0.

import { useState, useCallback, useSyncExternalStore } from 'react';
import { Share2, ListChecks } from 'lucide-react';
import type { Lang } from '@/lib/types';
import { m } from '@/i18n/match';
import { getSaved, encodeSavedIds } from '@/lib/saveList';
import { trackEvent } from '@/lib/analytics';
import { subscribeSaved } from './savedStore';

interface SharePlanButtonProps {
  slug: string;
  lang: Lang;
  utmSource: string;
}

const COPIED: Record<Lang, string> = {
  en: 'Plan link copied ✓',
  ar: 'تم نسخ رابط الخطة ✓',
  es: 'Enlace del plan copiado ✓',
};

function savedCount(): number {
  return getSaved().length;
}

export default function SharePlanButton({ slug, lang, utmSource }: SharePlanButtonProps) {
  const [copied, setCopied] = useState(false);
  // Server snapshot 0 → matches server HTML; real count after hydration.
  const count = useSyncExternalStore(subscribeSaved, savedCount, () => 0);

  const buildUrl = useCallback((): string => {
    if (typeof window === 'undefined') return '';
    const token = encodeSavedIds(getSaved());
    const url = new URL('/plan', window.location.origin);
    url.searchParams.set('saved', token);
    // Tag the shared link so re-share clicks are distinguishable from seed posts.
    url.searchParams.set('utm_source', utmSource || 'plan_share');
    url.searchParams.set('utm_medium', 'plan');
    return url.toString();
  }, [utmSource]);

  const onShare = useCallback(async () => {
    const url = buildUrl();
    if (!url) return;
    const text = m.share_plan[lang];
    trackEvent('plan_share_tap', { match: slug, count });

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: text, text, url });
        return;
      } catch {
        // dismissed / unsupported — fall through to copy
      }
    }
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        trackEvent('plan_share_copy', { match: slug, count });
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // clipboard blocked — nothing safe to do
    }
  }, [buildUrl, lang, slug, count]);

  // Nothing saved → no plan to share (and keeps SSR/first-client render clean).
  if (count === 0) return null;

  return (
    <button
      type="button"
      onClick={onShare}
      aria-label={m.share_plan[lang]}
      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-teal-700 bg-white px-5 font-semibold text-teal-700 hover:bg-teal-50 active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 motion-safe:transition-all motion-safe:duration-150"
    >
      {copied ? (
        <span>{COPIED[lang]}</span>
      ) : (
        <>
          <Share2 size={18} aria-hidden="true" />
          <span>{m.share_plan[lang]}</span>
          <span className="inline-flex items-center gap-1 text-xs font-normal text-teal-600">
            <ListChecks size={13} aria-hidden="true" />
            {count}
          </span>
        </>
      )}
    </button>
  );
}
