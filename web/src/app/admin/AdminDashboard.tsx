'use client';

import { useState } from 'react';
import { MapPin, Inbox, Users, LogOut } from 'lucide-react';
import type { Lang } from '@/lib/types';
import { ta } from '@/i18n/admin';
import { signOut } from '@/lib/auth';
import { LocationsPanel } from './LocationsPanel';
import { ClaimsPanel } from './ClaimsPanel';
import { UsersPanel } from './UsersPanel';

interface AdminDashboardProps {
  lang: Lang;
  email: string;
  accessToken: string;
}

type Tab = 'locations' | 'claims' | 'users';

const TABS: { key: Tab; labelKey: 'nav_locations' | 'nav_claims' | 'nav_users'; Icon: typeof MapPin }[] = [
  { key: 'locations', labelKey: 'nav_locations', Icon: MapPin },
  { key: 'claims', labelKey: 'nav_claims', Icon: Inbox },
  { key: 'users', labelKey: 'nav_users', Icon: Users },
];

export function AdminDashboard({ lang, email, accessToken }: AdminDashboardProps) {
  const [tab, setTab] = useState<Tab>('locations');

  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      // The auth listener in the parent page will reset the session.
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-600 truncate">{email}</p>
        <button
          onClick={handleSignOut}
          className="h-11 px-4 bg-stone-100 hover:bg-stone-200 text-stone-900 font-medium rounded-lg flex items-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 ring-teal-600 active:scale-[0.98] transition-all motion-safe:duration-150"
        >
          <LogOut size={20} />
          <span className="hidden sm:inline">
            {lang === 'ar' ? 'تسجيل الخروج' : lang === 'es' ? 'Cerrar sesión' : 'Sign out'}
          </span>
        </button>
      </div>

      <div
        role="tablist"
        aria-label={ta.admin_title[lang]}
        className="flex gap-1 bg-stone-100 rounded-xl p-1"
      >
        {TABS.map(({ key, labelKey, Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={active}
              aria-controls={`panel-${key}`}
              id={`tab-${key}`}
              onClick={() => setTab(key)}
              className={`flex-1 h-11 px-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium cursor-pointer focus:outline-none focus-visible:ring-2 ring-teal-600 transition-all motion-safe:duration-150 ${
                active
                  ? 'bg-white text-teal-800 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{ta[labelKey][lang]}</span>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
      >
        {tab === 'locations' && (
          <LocationsPanel lang={lang} accessToken={accessToken} />
        )}
        {tab === 'claims' && (
          <ClaimsPanel lang={lang} accessToken={accessToken} />
        )}
        {tab === 'users' && (
          <UsersPanel lang={lang} accessToken={accessToken} />
        )}
      </div>
    </div>
  );
}
