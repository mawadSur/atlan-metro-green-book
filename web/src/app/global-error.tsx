'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Top-level error boundary — catches errors in layout.tsx and root-level failures.
 * Must render its own <html> and <body> per Next.js App Router requirements.
 * Minimal branded message (no i18n context available at this level).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <div
          style={{
            minHeight: '100vh',
            background: '#fafaf9',
            display: 'grid',
            placeItems: 'center',
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: '1.5rem',
              maxWidth: '28rem',
              width: '100%',
              border: '1px solid #e7e5e4',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <AlertCircle
                style={{ width: '1.5rem', height: '1.5rem', color: '#dc2626', flexShrink: 0 }}
              />
              <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1c1917', margin: 0 }}>
                Something went wrong
              </h1>
            </div>

            <p style={{ color: '#57534e', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '1rem' }}>
              We encountered an unexpected error. Please try refreshing the page.
            </p>

            <button
              onClick={reset}
              style={{
                width: '100%',
                background: '#0f766e',
                color: '#ffffff',
                borderRadius: '0.5rem',
                padding: '0.75rem 1rem',
                fontWeight: 500,
                cursor: 'pointer',
                border: 'none',
                fontSize: '1rem',
              }}
              type="button"
            >
              Try again
            </button>

            {error.digest && (
              <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#a8a29e', textAlign: 'center' }}>
                Error ID: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
