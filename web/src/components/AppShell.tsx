'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, List, Loader2 } from 'lucide-react';
import type { City, Filters, Lang, Location } from '@/lib/types';
import type { MapBounds } from './MapView';
import { localized } from '@/lib/display';
import { LANGS, t } from '@/i18n/strings';
import { supabase } from '@/lib/supabase';
import LocationCard from './LocationCard';
import LocationDetail from './LocationDetail';
import FilterBar from './FilterBar';
import SearchBar from './SearchBar';
import LangSwitcher from './LangSwitcher';
import WorldCupBanner from './WorldCupBanner';
import TopNav from './TopNav';

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

const MAX_RENDERED = 100; // Cap list items to prevent DOM explosion

export default function AppShell({
  city,
  locations: initialLocations,
}: {
  city: City | null;
  locations: Location[];
}) {
  const [lang, setLang] = useState<Lang>('en');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Location | null>(null);
  const [view, setView] = useState<'map' | 'list'>('map'); // mobile toggle
  const [worldCupFilter, setWorldCupFilter] = useState(false);

  // All loaded locations (starts with initial, grows as map moves)
  const [allLocations, setAllLocations] = useState<Location[]>(initialLocations);
  const [isLoadingViewport, setIsLoadingViewport] = useState(false);

  const dir = LANGS.find((l) => l.code === lang)?.dir ?? 'ltr';

  // Fetch locations for new viewport bounds and merge into state
  const handleViewportChange = useCallback(
    async (bounds: MapBounds) => {
      if (!city) return;

      setIsLoadingViewport(true);
      try {
        const { data, error } = await supabase
          .from('locations')
          .select('*')
          .eq('city_id', city.id)
          .gte('lat', bounds.south)
          .lte('lat', bounds.north)
          .gte('lng', bounds.west)
          .lte('lng', bounds.east)
          .order('name_en')
          .limit(500);

        if (error) throw error;

        // Merge new locations, dedupe by id
        setAllLocations((prev) => {
          const existing = new Set(prev.map((l) => l.id));
          const newLocs = (data ?? []).filter((l) => !existing.has(l.id));
          return [...prev, ...newLocs];
        });
      } catch (err) {
        console.error('Failed to load viewport locations:', err);
      } finally {
        setIsLoadingViewport(false);
      }
    },
    [city]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allLocations.filter((loc) => {
      if (filters.halal_certified && !loc.halal_certified) return false;
      if (filters.alcohol_free && !loc.alcohol_free) return false;
      if (filters.prayer_space && !loc.prayer_space) return false;
      if (filters.family_friendly && !loc.family_friendly) return false;
      if (worldCupFilter && !(loc.worldcup_special || loc.type === 'worldcup_venue')) return false;
      if (q) {
        const hay = `${loc.name_en} ${loc.name_ar} ${loc.name_es} ${loc.address}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allLocations, filters, query, worldCupFilter]);

  // Cap rendered list to prevent DOM explosion
  const displayedInList = useMemo(() => {
    return filtered.slice(0, MAX_RENDERED);
  }, [filtered]);

  const hasActiveFilters = Object.values(filters).some((v) => v) || query || worldCupFilter;

  const center: [number, number] = city
    ? [city.center_lat, city.center_lng]
    : [33.7545, -84.3898];
  const zoom = city?.default_zoom ?? 11;

  return (
    <div dir={dir} className="flex flex-col min-h-dvh">
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
        <TopNav
          lang={lang}
          currentView={worldCupFilter ? 'worldcup' : 'places'}
          onWorldCupClick={() => setWorldCupFilter(!worldCupFilter)}
        />
        <div className="px-4 pb-3 space-y-2">
          <SearchBar value={query} onChange={setQuery} lang={lang} />
          <FilterBar filters={filters} onChange={setFilters} lang={lang} />
        </div>
      </header>

      {/* Mobile view toggle */}
      <div className="shrink-0 sm:hidden flex border-b border-stone-200 bg-white">
        {(['map', 'list'] as const).map((v) => {
          const Icon = v === 'map' ? MapPin : List;
          return (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 py-3 min-h-[44px] flex items-center justify-center gap-2 text-sm font-medium cursor-pointer focus-visible:ring-2 focus-visible:ring-teal-600 active:scale-[0.98] motion-safe:transition-all motion-safe:duration-150 ${
                view === v ? 'text-teal-700 border-b-2 border-teal-700' : 'text-stone-500 hover:text-teal-600'
              }`}
            >
              <Icon size={18} />
              <span>{t[v][lang]}</span>
            </button>
          );
        })}
      </div>

      {/* Body: list + map */}
      <main className="flex-1 min-h-0 flex">
        {/* List */}
        <section
          className={`${
            view === 'list' ? 'flex' : 'hidden'
          } sm:flex flex-col w-full sm:w-[380px] md:w-[420px] shrink-0 border-e border-stone-200 bg-stone-50 overflow-y-auto`}
        >
          <div className="px-4 py-2 flex items-center justify-between text-xs text-stone-500">
            <span>
              {filtered.length > MAX_RENDERED
                ? `Showing ${MAX_RENDERED} of ${filtered.length}`
                : `${filtered.length} ${t.results[lang]}`}
            </span>
            {isLoadingViewport && (
              <Loader2 size={14} className="animate-spin text-teal-600" />
            )}
          </div>
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-stone-500">{t.noResults[lang]}</p>
          ) : (
            <div className="px-3 pb-6 grid grid-cols-1 gap-3">
              {!hasActiveFilters && (
                <WorldCupBanner
                  lang={lang}
                  onExplore={() => setWorldCupFilter(true)}
                />
              )}
              {displayedInList.map((loc) => (
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
            onMoveEnd={handleViewportChange}
            center={center}
            zoom={zoom}
          />
        </section>
      </main>

      <LocationDetail loc={selected} lang={lang} onClose={() => setSelected(null)} />
    </div>
  );
}
