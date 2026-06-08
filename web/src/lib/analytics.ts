// Thin client-side analytics wrapper.
//
// Consumers MUST be client components — this re-exports the browser `track`
// from @vercel/analytics. Do NOT import this from a Server Component or a
// 'use server' module.

import { track } from '@vercel/analytics/react';

export { track };

/**
 * Fire a tracked event, swallowing any error so analytics can never break a
 * user flow. No-op on the server or if the analytics script isn't loaded.
 */
export function trackEvent(
  name: string,
  props?: Record<string, string | number | boolean>
): void {
  try {
    if (typeof window === 'undefined') return;
    track(name, props);
  } catch {
    // Analytics is best-effort; never throw into the UI.
  }
}

/**
 * Read UTM params from the current URL's query string.
 * Returns {} on the server or when no UTM params are present.
 */
export function readUtm(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const params = new URLSearchParams(window.location.search);
    const out: Record<string, string> = {};
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign']) {
      const v = params.get(key);
      if (v) out[key] = v;
    }
    return out;
  } catch {
    return {};
  }
}
