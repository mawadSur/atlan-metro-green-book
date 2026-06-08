'use client';

// ♡ save toggle for a single place, backed by the no-login saveList.
//
// Hydration safety: the saved state lives in localStorage, which the server
// cannot know. We read it via useSyncExternalStore with a `getServerSnapshot`
// that always returns `false`, so the server HTML and the first client render
// agree (both render the empty heart). After hydration the store snapshot
// updates to the real value. A module-level listener set lets sibling toggles
// re-render in sync when any of them changes the list.

import { useSyncExternalStore, useCallback } from 'react';
import { Heart } from 'lucide-react';
import type { Lang } from '@/lib/types';
import { m } from '@/i18n/match';
import { getSaved, toggleSaved } from '@/lib/saveList';
import { trackEvent } from '@/lib/analytics';

interface SaveToggleProps {
  placeId: string;
  slug: string;
  lang: Lang;
}

// --- tiny external store over localStorage --------------------------------
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  // Cross-tab changes also refresh the snapshot.
  const onStorage = () => emit();
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}

function snapshotFor(id: string): boolean {
  return getSaved().includes(id);
}

export default function SaveToggle({ placeId, slug, lang }: SaveToggleProps) {
  const getSnapshot = useCallback(() => snapshotFor(placeId), [placeId]);
  // Server snapshot: never saved → matches the empty-heart server HTML.
  const saved = useSyncExternalStore(subscribe, getSnapshot, () => false);

  const onToggle = useCallback(() => {
    toggleSaved(placeId);
    trackEvent('save_toggle', { match: slug, saved: !saved });
    emit();
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
