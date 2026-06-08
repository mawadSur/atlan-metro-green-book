'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  ShieldCheck,
  ShieldX,
  Pencil,
  Save,
  X,
  BadgeCheck,
  AlertCircle,
} from 'lucide-react';
import type { Lang, Location } from '@/lib/types';
import { ta } from '@/i18n/admin';
import {
  listLocations,
  editLocation,
  verifyHalal,
  unverifyHalal,
} from '@/lib/admin';

interface LocationsPanelProps {
  lang: Lang;
  accessToken: string;
}

type Status = 'idle' | 'loading' | 'error';

function localizedName(loc: Location, lang: Lang): string {
  if (lang === 'ar') return loc.name_ar || loc.name_en;
  if (lang === 'es') return loc.name_es || loc.name_en;
  return loc.name_en;
}

export function LocationsPanel({ lang, accessToken }: LocationsPanelProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const rows = await listLocations(accessToken);
      setLocations(rows ?? []);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  function patchLocal(updated: Location) {
    setLocations((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }

  const q = query.trim().toLowerCase();
  const visible = q
    ? locations.filter((l) =>
        [l.name_en, l.name_ar, l.name_es, l.address]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(q))
      )
    : locations;

  if (status === 'loading') {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <div className="h-32 flex items-center justify-center text-stone-600">
          {ta.loading[lang]}
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <div role="alert" className="flex flex-col items-center gap-3 text-center">
          <AlertCircle size={32} className="text-red-500" aria-hidden="true" />
          <p className="text-stone-700">{ta.error[lang]}</p>
          <button
            onClick={load}
            className="h-11 px-4 bg-stone-100 hover:bg-stone-200 text-stone-900 font-medium rounded-lg cursor-pointer focus:outline-none focus-visible:ring-2 ring-teal-600 active:scale-[0.98] transition-all motion-safe:duration-150"
          >
            {ta.retry[lang]}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          size={18}
          className="absolute top-1/2 -translate-y-1/2 start-3 text-stone-400 pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={ta.search[lang]}
          aria-label={ta.search[lang]}
          className="w-full h-11 ps-10 pe-3 border border-stone-300 rounded-lg bg-white focus:outline-none focus-visible:ring-2 ring-teal-600 transition-shadow motion-safe:duration-150"
        />
      </div>

      {visible.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm text-center text-stone-600">
          {lang === 'ar'
            ? 'لا توجد مواقع.'
            : lang === 'es'
              ? 'No se encontraron ubicaciones.'
              : 'No locations found.'}
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((loc) => (
            <LocationCard
              key={loc.id}
              loc={loc}
              lang={lang}
              accessToken={accessToken}
              onUpdated={patchLocal}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

interface LocationCardProps {
  loc: Location;
  lang: Lang;
  accessToken: string;
  onUpdated: (loc: Location) => void;
}

type CardState = 'idle' | 'working' | 'saved' | 'error';

function LocationCard({ loc, lang, accessToken, onUpdated }: LocationCardProps) {
  const [editing, setEditing] = useState(false);
  const [cardState, setCardState] = useState<CardState>('idle');

  // Editable fields.
  const [phone, setPhone] = useState(loc.phone ?? '');
  const [address, setAddress] = useState(loc.address ?? '');
  const [imageUrl, setImageUrl] = useState(loc.image_url ?? '');

  function flash(next: CardState) {
    setCardState(next);
    if (next === 'saved' || next === 'error') {
      setTimeout(() => setCardState('idle'), 2500);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setCardState('working');
    try {
      const updated = await editLocation(accessToken, loc.id, {
        phone,
        address,
        image_url: imageUrl,
      });
      onUpdated(updated ?? { ...loc, phone, address, image_url: imageUrl });
      setEditing(false);
      flash('saved');
    } catch {
      flash('error');
    }
  }

  async function handleVerify() {
    const verifiedBy = window.prompt(ta.verified_by_label[lang]);
    if (!verifiedBy || !verifiedBy.trim()) return;
    setCardState('working');
    try {
      const updated = await verifyHalal(accessToken, loc.id, verifiedBy.trim());
      onUpdated(
        updated ?? {
          ...loc,
          halal_status: 'verified',
          verified_by: verifiedBy.trim(),
        }
      );
      flash('saved');
    } catch {
      flash('error');
    }
  }

  async function handleUnverify() {
    setCardState('working');
    try {
      const updated = await unverifyHalal(accessToken, loc.id);
      onUpdated(
        updated ?? {
          ...loc,
          halal_status: 'community-listed',
          verified_by: '',
          verified_at: null,
        }
      );
      flash('saved');
    } catch {
      flash('error');
    }
  }

  const isVerified = loc.halal_status === 'verified';
  const working = cardState === 'working';

  return (
    <li className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-stone-900 truncate">
            {localizedName(loc, lang)}
          </h3>
          {loc.address && (
            <p className="text-sm text-stone-500 truncate">{loc.address}</p>
          )}
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            aria-label={ta.edit[lang]}
            className="shrink-0 h-9 px-3 bg-stone-100 hover:bg-stone-200 text-stone-900 text-sm font-medium rounded-lg flex items-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 ring-teal-600 active:scale-[0.98] transition-all motion-safe:duration-150"
          >
            <Pencil size={16} />
            <span className="hidden sm:inline">{ta.edit[lang]}</span>
          </button>
        )}
      </div>

      {/* Halal verification — the platform's core trust action. */}
      <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          {isVerified ? (
            <BadgeCheck size={20} className="text-teal-700" aria-hidden="true" />
          ) : (
            <AlertCircle size={20} className="text-amber-500" aria-hidden="true" />
          )}
          <span className="text-sm font-semibold text-stone-900">
            {isVerified
              ? ta.halal_verified[lang]
              : loc.halal_status === 'community-listed'
                ? ta.halal_community[lang]
                : ta.halal_unverified[lang]}
          </span>
        </div>

        {isVerified && loc.verified_by && (
          <p className="text-xs text-stone-600 mb-3">
            {ta.verified_by_label[lang]}: <strong>{loc.verified_by}</strong>
            {loc.verified_at ? ` · ${new Date(loc.verified_at).toLocaleDateString()}` : ''}
          </p>
        )}

        {isVerified ? (
          <button
            onClick={handleUnverify}
            disabled={working}
            className="h-11 w-full px-4 bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 font-medium rounded-lg flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 ring-teal-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all motion-safe:duration-150"
          >
            <ShieldX size={20} />
            {ta.unverify[lang]}
          </button>
        ) : (
          <button
            onClick={handleVerify}
            disabled={working}
            className="h-11 w-full px-4 bg-teal-700 hover:bg-emerald-800 text-white font-medium rounded-lg flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 ring-teal-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all motion-safe:duration-150"
          >
            <ShieldCheck size={20} />
            {ta.mark_verified[lang]}
          </button>
        )}
      </div>

      {editing && (
        <form onSubmit={handleSave} className="mt-4 space-y-3">
          <div>
            <label
              htmlFor={`addr-${loc.id}`}
              className="block text-sm font-medium text-stone-900 mb-1"
            >
              {lang === 'ar' ? 'العنوان' : lang === 'es' ? 'Dirección' : 'Address'}
            </label>
            <input
              id={`addr-${loc.id}`}
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full h-11 px-3 border border-stone-300 rounded-lg focus:outline-none focus-visible:ring-2 ring-teal-600 transition-shadow motion-safe:duration-150"
            />
          </div>
          <div>
            <label
              htmlFor={`phone-${loc.id}`}
              className="block text-sm font-medium text-stone-900 mb-1"
            >
              {lang === 'ar' ? 'الهاتف' : lang === 'es' ? 'Teléfono' : 'Phone'}
            </label>
            <input
              id={`phone-${loc.id}`}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-11 px-3 border border-stone-300 rounded-lg focus:outline-none focus-visible:ring-2 ring-teal-600 transition-shadow motion-safe:duration-150"
            />
          </div>
          <div>
            <label
              htmlFor={`img-${loc.id}`}
              className="block text-sm font-medium text-stone-900 mb-1"
            >
              {lang === 'ar' ? 'رابط الصورة' : lang === 'es' ? 'URL de foto' : 'Photo URL'}
            </label>
            <input
              id={`img-${loc.id}`}
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
              className="w-full h-11 px-3 border border-stone-300 rounded-lg focus:outline-none focus-visible:ring-2 ring-teal-600 transition-shadow motion-safe:duration-150"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={working}
              className="flex-1 h-11 px-4 bg-teal-700 hover:bg-emerald-800 text-white font-medium rounded-lg flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 ring-teal-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all motion-safe:duration-150"
            >
              <Save size={18} />
              {working ? ta.saving[lang] : ta.save[lang]}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="h-11 px-4 bg-stone-100 hover:bg-stone-200 text-stone-900 font-medium rounded-lg flex items-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 ring-teal-600 active:scale-[0.98] transition-all motion-safe:duration-150"
            >
              <X size={18} />
              {ta.cancel[lang]}
            </button>
          </div>
        </form>
      )}

      {cardState === 'saved' && (
        <p aria-live="polite" className="mt-3 text-sm text-green-600">
          {ta.saved[lang]}
        </p>
      )}
      {cardState === 'error' && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {ta.error[lang]}
        </p>
      )}
    </li>
  );
}
