'use client';

import Link from 'next/link';
import { MapPin, Clock, Trophy, Store } from 'lucide-react';
import type { Lang } from '@/lib/types';
import { tp } from '@/i18n/portal';

interface TopNavProps {
  lang: Lang;
  currentView: 'places' | 'prayer' | 'worldcup' | 'portal';
  onWorldCupClick?: () => void;
}

export default function TopNav({ lang, currentView, onWorldCupClick }: TopNavProps) {
  const navItems = [
    { id: 'places' as const, icon: MapPin, label: tp.nav_places[lang], href: null },
    { id: 'prayer' as const, icon: Clock, label: tp.nav_prayer[lang], href: `/prayer?lang=${lang}` },
    { id: 'worldcup' as const, icon: Trophy, label: tp.nav_worldcup[lang], href: null },
    { id: 'portal' as const, icon: Store, label: tp.nav_portal[lang], href: `/portal?lang=${lang}` },
  ];

  return (
    <nav className="flex items-center gap-1 px-2 py-1" role="navigation">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;

        if (item.id === 'places') {
          // Places is the current page, no link needed
          return (
            <button
              key={item.id}
              disabled
              aria-current="page"
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg text-xs font-medium cursor-default ${
                isActive ? 'bg-teal-600 text-white' : 'text-white/80'
              }`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          );
        }

        if (item.id === 'worldcup') {
          // World Cup is a filter action, not a navigation
          return (
            <button
              key={item.id}
              onClick={onWorldCupClick}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg text-xs font-medium cursor-pointer focus-visible:ring-2 focus-visible:ring-white active:scale-[0.98] motion-safe:transition-all motion-safe:duration-150 ${
                isActive
                  ? 'bg-amber-600 text-white'
                  : 'text-white/90 hover:bg-white/10'
              }`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          );
        }

        // Prayer and Portal are links
        return (
          <Link
            key={item.id}
            href={item.href!}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg text-xs font-medium cursor-pointer focus-visible:ring-2 focus-visible:ring-white active:scale-[0.98] motion-safe:transition-all motion-safe:duration-150 ${
              isActive
                ? 'bg-teal-600 text-white'
                : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <Icon size={16} />
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
