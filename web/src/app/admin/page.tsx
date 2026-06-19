'use client';

import { Suspense, useState, useEffect } from 'react';
import { ArrowLeft, Eye, EyeOff, QrCode } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { Lang } from '@/lib/types';
import { LANGS } from '@/i18n/strings';
import { ta } from '@/i18n/admin';
import { getSession, onAuthChange, signIn } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { LocationsAdmin } from './LocationsAdmin';
import { ClaimsAdmin } from './ClaimsAdmin';
import { UsersAdmin } from './UsersAdmin';

export const dynamic = 'force-dynamic';

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-stone-50 flex items-center justify-center">
          <div className="text-stone-600">{ta.loading.en}</div>
        </div>
      }
    >
      <AdminInner />
    </Suspense>
  );
}

type Tab = 'locations' | 'claims' | 'users';

function AdminInner() {
  const searchParams = useSearchParams();
  const langParam = (searchParams.get('lang') || 'en') as Lang;
  const lang = ['en', 'ar', 'es'].includes(langParam) ? langParam : 'en';
  const dir = LANGS.find(l => l.code === lang)?.dir || 'ltr';

  const [session, setSession] = useState<{ userId: string; email: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('locations');

  useEffect(() => {
    async function checkSession() {
      const s = await getSession();
      if (s?.user) {
        const userId = s.user.id;
        const email = s.user.email ?? '';
        setSession({ userId, email });

        // Check if user is admin
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();

        if (data?.role === 'admin') {
          setIsAdmin(true);
        }
      }
      setLoading(false);
    }

    checkSession();

    const unsubscribe = onAuthChange(async (_event, session) => {
      if (session?.user) {
        const userId = session.user.id;
        const email = session.user.email ?? '';
        setSession({ userId, email });

        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();

        if (data?.role === 'admin') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } else {
        setSession(null);
        setIsAdmin(false);
      }
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="min-h-dvh bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">{ta.loading[lang]}</div>
      </div>
    );
  }

  return (
    <div dir={dir} className="min-h-dvh bg-stone-50">
      <div className="max-w-6xl mx-auto p-4">
        <header className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-teal-700 mb-4 focus:outline-none focus-visible:ring-2 ring-teal-600 rounded transition-colors motion-safe:duration-150 cursor-pointer"
          >
            <ArrowLeft size={16} />
            {ta.back[lang]}
          </Link>
          <h1 className="text-2xl font-bold text-stone-900">{ta.adminTitle[lang]}</h1>
        </header>

        {!session ? (
          <LoginForm lang={lang} />
        ) : !isAdmin ? (
          <div className="bg-white rounded-lg p-6 border border-stone-200">
            <p className="text-stone-900">{ta.notAuthorized[lang]}</p>
          </div>
        ) : (
          <div>
            {/* Tab navigation */}
            <nav className="flex gap-2 mb-6 border-b border-stone-200">
              <button
                onClick={() => setActiveTab('locations')}
                className={`px-4 py-2 text-sm font-medium transition-colors motion-safe:duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 ring-teal-600 rounded-t ${
                  activeTab === 'locations'
                    ? 'text-teal-700 border-b-2 border-teal-700'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {ta.tabLocations[lang]}
              </button>
              <button
                onClick={() => setActiveTab('claims')}
                className={`px-4 py-2 text-sm font-medium transition-colors motion-safe:duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 ring-teal-600 rounded-t ${
                  activeTab === 'claims'
                    ? 'text-teal-700 border-b-2 border-teal-700'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {ta.tabClaims[lang]}
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`px-4 py-2 text-sm font-medium transition-colors motion-safe:duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 ring-teal-600 rounded-t ${
                  activeTab === 'users'
                    ? 'text-teal-700 border-b-2 border-teal-700'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {ta.tabUsers[lang]}
              </button>
              <a
                href="/print/match-day-flyer.html"
                target="_blank"
                rel="noopener noreferrer"
                className="ms-auto inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-teal-700 hover:text-emerald-800 focus:outline-none focus-visible:ring-2 ring-teal-600 rounded-t transition-colors motion-safe:duration-150 cursor-pointer"
              >
                <QrCode size={16} />
                {ta.marketingAssets[lang]}
              </a>
            </nav>

            {/* Tab content */}
            {activeTab === 'locations' && <LocationsAdmin lang={lang} userId={session.userId} />}
            {activeTab === 'claims' && <ClaimsAdmin lang={lang} />}
            {activeTab === 'users' && <UsersAdmin lang={lang} />}
          </div>
        )}
      </div>
    </div>
  );
}

function LoginForm({ lang }: { lang: Lang }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
    } catch {
      setError(ta.authError[lang]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 border border-stone-200 max-w-md">
      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-stone-900 mb-1">
            {ta.email[lang]}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-stone-200 rounded focus:outline-none focus-visible:ring-2 ring-teal-600 text-stone-900"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-stone-900 mb-1">
            {ta.password[lang]}
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-stone-200 rounded focus:outline-none focus-visible:ring-2 ring-teal-600 text-stone-900"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-600 hover:text-stone-900 focus:outline-none focus-visible:ring-2 ring-teal-600 rounded p-1 cursor-pointer"
              aria-label={showPassword ? ta.hidePassword[lang] : ta.showPassword[lang]}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-teal-700 text-white px-4 py-2 rounded font-medium hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 ring-teal-600 transition-colors motion-safe:duration-150 cursor-pointer"
        >
          {loading ? ta.signingIn[lang] : ta.signIn[lang]}
        </button>
      </div>
    </form>
  );
}
