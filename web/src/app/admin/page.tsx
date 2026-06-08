'use client';

import { Suspense, useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { Lang, Role } from '@/lib/types';
import { LANGS } from '@/i18n/strings';
import { ta } from '@/i18n/admin';
import { getSession, onAuthChange } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { AdminGate } from './AdminGate';
import { AdminDashboard } from './AdminDashboard';

export const dynamic = 'force-dynamic';

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-stone-50 flex items-center justify-center">
          <div className="text-stone-600">Loading…</div>
        </div>
      }
    >
      <AdminInner />
    </Suspense>
  );
}

interface AdminSession {
  userId: string;
  email: string;
  accessToken: string;
}

function AdminInner() {
  const searchParams = useSearchParams();
  const langParam = (searchParams.get('lang') || 'en') as Lang;
  const lang = ['en', 'ar', 'es'].includes(langParam) ? langParam : 'en';
  const dir = LANGS.find((l) => l.code === lang)?.dir || 'ltr';

  const [session, setSession] = useState<AdminSession | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  // Resolve the caller's role from the profiles table for the current auth.uid().
  // This is a client-side hint only — the real gate is RLS + server-side
  // requireAdmin in the lane-V server actions.
  async function resolveRole(userId: string): Promise<Role | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    if (error || !data) return null;
    return (data.role as Role) ?? null;
  }

  useEffect(() => {
    let active = true;

    async function init() {
      const s = await getSession();
      if (s?.user) {
        if (!active) return;
        setSession({
          userId: s.user.id,
          email: s.user.email ?? '',
          accessToken: s.access_token,
        });
        const r = await resolveRole(s.user.id);
        if (!active) return;
        setRole(r);
      }
      if (active) setLoading(false);
    }

    init();

    const unsubscribe = onAuthChange(async (_event, next) => {
      if (next?.user) {
        setSession({
          userId: next.user.id,
          email: next.user.email ?? '',
          accessToken: next.access_token,
        });
        const r = await resolveRole(next.user.id);
        if (active) setRole(r);
      } else {
        setSession(null);
        setRole(null);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const isAdmin = !!session && role === 'admin';

  return (
    <div dir={dir} className="min-h-dvh bg-stone-50">
      <div className="max-w-3xl mx-auto p-4">
        <header className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-teal-700 mb-4 focus:outline-none focus-visible:ring-2 ring-teal-600 rounded transition-colors motion-safe:duration-150"
          >
            <ArrowLeft size={16} />
            <span>{lang === 'ar' ? 'رجوع' : lang === 'es' ? 'Volver' : 'Back'}</span>
          </Link>
          <h1 className="text-2xl font-bold text-stone-900">{ta.admin_title[lang]}</h1>
        </header>

        {loading ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
            <div className="h-32 flex items-center justify-center text-stone-600">
              {ta.loading[lang]}
            </div>
          </div>
        ) : isAdmin && session ? (
          <AdminDashboard
            lang={lang}
            email={session.email}
            accessToken={session.accessToken}
          />
        ) : (
          <AdminGate lang={lang} signedIn={!!session} />
        )}
      </div>
    </div>
  );
}
