'use client';

// Hydration-safe client-only hooks built on useSyncExternalStore.
//
// React 19 + the project's lint rules forbid calling setState synchronously
// inside an effect (it causes cascading renders). useSyncExternalStore is the
// sanctioned way to surface a value the SERVER cannot know (the wall clock,
// the URL's UTM params) without a hydration mismatch: the `getServerSnapshot`
// returns a stable value that matches the server HTML, then the real client
// value flows in after hydration.

import { useSyncExternalStore } from 'react';

// --- shared 30s clock ------------------------------------------------------
const clockListeners = new Set<() => void>();
let clockTimer: ReturnType<typeof setInterval> | null = null;

function clockSubscribe(cb: () => void): () => void {
  clockListeners.add(cb);
  if (clockTimer === null && typeof window !== 'undefined') {
    clockTimer = setInterval(() => {
      for (const l of clockListeners) l();
    }, 30000);
  }
  return () => {
    clockListeners.delete(cb);
    if (clockListeners.size === 0 && clockTimer !== null) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
  };
}

/**
 * The current epoch ms, refreshed every 30s. Returns `null` on the server and
 * on the first client render (so server + first client HTML agree), then the
 * real time after hydration.
 */
export function useNow(): number | null {
  return useSyncExternalStore(
    clockSubscribe,
    () => Date.now(),
    () => null
  );
}

// --- one-shot UTM source ---------------------------------------------------
function noopSubscribe(): () => void {
  return () => {};
}

function readUtmSource(): string {
  if (typeof window === 'undefined') return '';
  try {
    return new URLSearchParams(window.location.search).get('utm_source') ?? '';
  } catch {
    return '';
  }
}

/**
 * The `utm_source` query param. Server snapshot is '' (matching the server
 * HTML); the real value resolves after hydration. The param doesn't change
 * within a page view, so no subscription is needed.
 */
export function useUtmSource(): string {
  return useSyncExternalStore(noopSubscribe, readUtmSource, () => '');
}
