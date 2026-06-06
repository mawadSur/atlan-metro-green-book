'use client';

import { useEffect } from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';
import { t } from '@/i18n/strings';
import type { Lang } from '@/lib/types';

/**
 * App Router error boundary for /app routes.
 * Catches errors during render (e.g., Supabase failures in page.tsx).
 * Shows branded error card with retry button.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to monitoring service in production
    console.error('App error:', error);
  }, [error]);

  // Default to English for error screens (no lang context available here)
  const lang: Lang = 'en';

  return (
    <div className="min-h-dvh bg-stone-50 grid place-items-center p-4">
      <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full border border-stone-200">
        <div className="flex items-start gap-3 mb-4">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h1 className="text-xl font-semibold text-stone-900 mb-2">
              {t.errorTitle[lang]}
            </h1>
            <p className="text-stone-600 text-sm leading-relaxed">
              {t.errorLoadingPlaces[lang]}
            </p>
          </div>
        </div>

        <button
          onClick={reset}
          className="w-full flex items-center justify-center gap-2 bg-teal-700 text-white rounded-lg px-4 py-3 font-medium cursor-pointer hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 transition-colors duration-200 motion-safe:active:scale-[0.98] motion-safe:transition-transform"
          type="button"
        >
          <RotateCw className="w-4 h-4" />
          {t.retry[lang]}
        </button>

        {error.digest && (
          <p className="mt-3 text-xs text-stone-400 text-center">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
