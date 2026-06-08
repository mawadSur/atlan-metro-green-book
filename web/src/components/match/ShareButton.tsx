'use client';

// Share the match plan. Uses the Web Share API on mobile (the primary path),
// falling back to copy-to-clipboard on desktop. A share TAP is a vanity signal
// (we can't know if the OS sheet completed), so we track the tap; we also track
// the copy fallback separately so the funnel distinguishes intent from action.

import { useState } from 'react';
import { Share2, Check, Link2 } from 'lucide-react';
import type { Lang } from '@/lib/types';
import { m } from '@/i18n/match';
import { trackEvent } from '@/lib/analytics';

interface ShareButtonProps {
  slug: string;
  lang: Lang;
  /** Share title/text (already localized by the parent). */
  shareText: string;
}

// Local "link copied" confirmation (not in the shared i18n dict).
const COPIED: Record<Lang, string> = {
  en: 'Link copied ✓',
  ar: 'تم نسخ الرابط ✓',
  es: 'Enlace copiado ✓',
};

export default function ShareButton({ slug, lang, shareText }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    trackEvent('share_tap', { match: slug });

    // Prefer the native share sheet on mobile.
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: shareText, text: shareText, url });
        return;
      } catch {
        // User dismissed or it failed — fall through to copy.
      }
    }

    // Desktop / unsupported: copy the link.
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        trackEvent('share_copy', { match: slug });
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Clipboard blocked — nothing more we can safely do.
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-xl bg-teal-700 text-white font-medium hover:bg-emerald-800 active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 motion-safe:transition-all motion-safe:duration-150"
      aria-live="polite"
    >
      {copied ? (
        <>
          <Check size={18} aria-hidden="true" />
          <span>{COPIED[lang]}</span>
        </>
      ) : (
        <>
          {typeof navigator !== 'undefined' && typeof navigator.share === 'function' ? (
            <Share2 size={18} aria-hidden="true" />
          ) : (
            <Link2 size={18} aria-hidden="true" />
          )}
          <span>{m.share_plan[lang]}</span>
        </>
      )}
    </button>
  );
}
