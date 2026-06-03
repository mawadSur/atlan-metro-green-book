'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { City, Filters, Lang, Location } from '@/lib/types';
import { localized } from '@/lib/display';
import { LANGS, t } from '@/i18n/strings';
import LocationCard from './LocationCard';
import LocationDetail from './LocationDetail';
import FilterBar from './FilterBar';
import SearchBar from './SearchBar';
import LangSwitcher from './LangSwitcher';

// Leaflet cannot server-render — load the map only on the client.
const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full grid place-items-center bg-stone-200 text-stone-500">
      <span>Loading map…</span>
    </div>
  ),
});

const EMPTY_FILTERS: Filters = {
  halal_certified: false,
  alcohol_free: false,
  prayer_space: false,
  family_friendly: false,
};

export default function AppShell({
  city,
  locations,
}: {
  city: City | null;
  locations: Location[];
}) {
  const [lang, setLang] = useState<Lang>('en');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Location | null>(null);
  const [view, setView] = useState<'map' | 'list'>('map'); // mobile toggle

  const dir = LANGS.find((l) => l.code === lang)?.dir ?? 'ltr';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return locations.filter((loc) => {
      if (filters.halal_certified && !loc.halal_certified) return false;
      if (filters.alcohol_free && !loc.alcohol_free) return false;
      if (filters.prayer_space && !loc.prayer_space) return false;
      if (filters.family_friendly && !loc.family_friendly) return false;
      if (q) {
        const hay = `${loc.name_en} ${loc.name_ar} ${loc.name_es} ${loc.address}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [locations, filters, query]);

  const center: [number, number] = city
    ? [city.center_lat, city.center_lng]
    : [33.7545, -84.3898];
  const zoom = city?.default_zoom ?? 11;

  return (
    <div dir={dir} className="flex flex-col h-screen">
      {/* Header */}
      <header className="shrink-0 bg-gradient-to-r from-teal-700 to-emerald-700 text-white">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight truncate">
              {t.appName[lang]}
            </h1>
            <p className="text-xs text-teal-100 truncate">{t.tagline[lang]}</p>
          </div>
          <LangSwitcher lang={lang} onChange={setLang} />
        </div>
        <div className="px-4 pb-3 space-y-2">
          <SearchBar value={query} onChange={setQuery} lang={lang} />
          <FilterBar filters={filters} onChange={setFilters} lang={lang} />
        </div>
      </header>

      {/* Mobile view toggle */}
      <div className="shrink-0 sm:hidden flex border-b border-stone-200 bg-white">
        {(['map', 'list'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 py-2 text-sm font-medium ${
              view === v ? 'text-teal-700 border-b-2 border-teal-700' : 'text-stone-500'
            }`}
          >
            {t[v][lang]}
          </button>
        ))}
      </div>

      {/* Body: list + map */}
      <main className="flex-1 min-h-0 flex">
        {/* List */}
        <section
          className={`${
            view === 'list' ? 'flex' : 'hidden'
          } sm:flex flex-col w-full sm:w-[380px] md:w-[420px] shrink-0 border-e border-stone-200 bg-stone-50 overflow-y-auto`}
        >
          <div className="px-4 py-2 text-xs text-stone-500">
            {filtered.length} {t.results[lang]}
          </div>
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-stone-500">{t.noResults[lang]}</p>
          ) : (
            <div className="px-3 pb-6 grid grid-cols-1 gap-3">
              {filtered.map((loc) => (
                <LocationCard
                  key={loc.id}
                  loc={loc}
                  lang={lang}
                  onClick={() => setSelected(loc)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Map */}
        <section
          className={`${
            view === 'map' ? 'block' : 'hidden'
          } sm:block flex-1 min-h-0`}
        >
          <MapView
            locations={filtered}
            lang={lang}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
            center={center}
            zoom={zoom}
          />
        </section>
      </main>

      <LocationDetail loc={selected} lang={lang} onClose={() => setSelected(null)} />
    </div>
  );
}
