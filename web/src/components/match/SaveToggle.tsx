'use client';

// ♡ save toggle for a single place, backed by the no-login saveList.
//
// Hydration safety: the saved state lives in localStorage, which the server
// cannot know. We read it via useSyncExternalStore with a `getServerSnapshot`
// that always returns `false`, so the server HTML and the first client render
// agree (both render the empty heart). After hydration the store snapshot
// updates to the real value. The shared savedStore lets sibling hearts AND the
// "Share my plan" button re-render in sync when any of them changes the list.

import { useSyncExternalStore, useCallback } from 'react';
import { Heart } from 'lucide-react';
import type { Lang } from '@/lib/types';
import { m } from '@/i18n/match';
import { getSaved, toggleSaved } from '@/lib/saveList';
import { trackEvent } from '@/lib/analytics';
import { subscribeSaved, emitSavedChange } from './savedStore';

interface SaveToggleProps {
  placeId: string;
  slug: string;
  lang: Lang;
}

function snapshotFor(id: string): boolean {
  return getSaved().includes(id);
}

export default function SaveToggle({ placeId, slug, lang }: SaveToggleProps) {
  const getSnapshot = useCallback(() => snapshotFor(placeId), [placeId]);
  // Server snapshot: never saved → matches the empty-heart server HTML.
  const saved = useSyncExternalStore(subscribeSaved, getSnapshot, () => false);

  const onToggle = useCallback(() => {
    toggleSaved(placeId);
    trackEvent('save_toggle', { match: slug, saved: !saved });
    emitSavedChange();
  }, [placeId, slug, saved]);

  const label = saved ? m.saved[lang] : m.save[lang];

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={saved}
      aria-label={label}
      title={label}
      className="inline-flex items-center justify-center w-11 h-11 rounded-full border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 motion-safe:transition-colors"
    >
      <Heart
        size={18}
        aria-hidden="true"
        className={saved ? 'fill-rose-500 text-rose-500' : ''}
      />
    </button>
  );
}
