import { Loader2 } from 'lucide-react';

/**
 * App Router loading UI — shown during route transitions and Suspense boundaries.
 * Branded skeleton/spinner for the main app.
 */
export default function Loading() {
  return (
    <div className="min-h-dvh bg-stone-50 grid place-items-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-teal-700 animate-spin" />
        <p className="text-stone-600 text-sm font-medium">
          Loading…
        </p>
      </div>
    </div>
  );
}
