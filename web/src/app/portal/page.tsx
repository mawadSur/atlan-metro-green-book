'use client';

import { Suspense, useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { Lang } from '@/lib/types';
import { LANGS } from '@/i18n/strings';
import { tp } from '@/i18n/portal';
import { getSession, onAuthChange } from '@/lib/auth';
import { LoginForm } from './LoginForm';
import { LocationEditor } from './LocationEditor';
import { ResetPasswordForm } from './ResetPasswordForm';

export const dynamic = 'force-dynamic';

export default function PortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-stone-50 flex items-center justify-center">
          <div className="text-stone-600">Loading…</div>
        </div>
      }
    >
      <PortalInner />
    </Suspense>
  );
}

function PortalInner() {
  const searchParams = useSearchParams();
  const langParam = (searchParams.get('lang') || 'en') as Lang;
  const lang = ['en', 'ar', 'es'].includes(langParam) ? langParam : 'en';
  const dir = LANGS.find(l => l.code === lang)?.dir || 'ltr';

  const [session, setSession] = useState<{ userId: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    async function checkSession() {
      const s = await getSession();
      if (s?.user) {
        setSession({ userId: s.user.id, email: s.user.email ?? '' });
      }
      setLoading(false);
    }

    checkSession();

    const unsubscribe = onAuthChange((event, session) => {
      // User followed the reset-password email link: prompt them to set a new one.
      if (event === 'PASSWORD_RECOVERY') {
        setRecovery(true);
      }
      if (session?.user) {
        setSession({ userId: session.user.id, email: session.user.email ?? '' });
      } else {
        setSession(null);
      }
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="min-h-dvh bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Loading...</div>
      </div>
    );
  }

  return (
    <div dir={dir} className="min-h-dvh bg-stone-50">
      <div className="max-w-md mx-auto p-4">
        <header className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-teal-700 mb-4 focus:outline-none focus-visible:ring-2 ring-teal-600 rounded transition-colors motion-safe:duration-150"
          >
            <ArrowLeft size={16} />
            {tp.back[lang]}
          </Link>
          <h1 className="text-2xl font-bold text-stone-900">{tp.portal_title[lang]}</h1>
        </header>

        {recovery && session ? (
          <ResetPasswordForm lang={lang} onDone={() => setRecovery(false)} />
        ) : session ? (
          <LocationEditor
            lang={lang}
            userId={session.userId}
            email={session.email}
            onSignOut={() => setSession(null)}
          />
        ) : (
          <LoginForm lang={lang} onSignedIn={() => {}} />
        )}
      </div>
    </div>
  );
}
