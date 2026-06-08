'use client';

// One stadium-area spot rendered with its HONEST editorial line.
//
// For FOOD spots that joined to a live DB row we reuse the shared LocationCard
// (so the halal chip / owner offer / verified provenance come straight from the
// DB) and feed it the curated transit label + caveat note via the additive
// props. For PRAYER spots — and any spot with no DB match — we render this
// dedicated card so the D7 prayer-trust contract is always met: provenance tier
// + prayer type + access note + Jummah, never an unqualified prayer location.
//
// Redundant encoding: every walkable/transit signal pairs a lucide glyph with
// explicit text, so meaning never depends on color alone.

import {
  Footprints,
  Bus,
  Navigation,
  Tag,
  Wine,
  Leaf,
  Moon,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { Lang, Location } from '@/lib/types';
import type { EnrichedSpot } from './viewModel';
import { localized, discountOffer, googleMapsUrl } from '@/lib/display';
import LocationCard from '@/components/LocationCard';
import SaveToggle from './SaveToggle';
import { sp } from './matchText';

interface SpotCardProps {
  spot: EnrichedSpot;
  slug: string;
  lang: Lang;
}

/** Build a synthetic Location for Google Maps directions when no DB row exists. */
function overlayDirectionsUrl(name: string): string {
  const q = encodeURIComponent(`${name} Atlanta GA`);
  return `https://www.google.com/maps/dir/?api=1&query=${q}`;
}

function TransitLine({ spot, lang }: { spot: EnrichedSpot; lang: Lang }) {
  const walkable = spot.overlay.walkable;
  const Icon = walkable ? Footprints : Bus;
  return (
    <p className="flex items-center gap-1.5 text-xs text-stone-600">
      <Icon size={14} className={walkable ? 'text-teal-700' : 'text-amber-700'} aria-hidden="true" />
      <span className="font-medium">{spot.overlay.transit_en}</span>
      {!walkable && <span className="text-amber-700">· {sp.not_walkable[lang]}</span>}
    </p>
  );
}

export default function SpotCard({ spot, slug, lang }: SpotCardProps) {
  const { overlay, db } = spot;
  const isPrayer = overlay.kind === 'prayer';

  // FOOD with a live DB row → reuse LocationCard with the curated line + note.
  if (!isPrayer && db) {
    const offer = db.discount_code ? discountOffer(db, lang) : '';
    const note = [overlay.note_en, offer ? `${sp.offer_valid_today[lang]} ${offer}` : '']
      .filter(Boolean)
      .join(' · ');
    return (
      <div className="relative">
        <LocationCard
          loc={db}
          lang={lang}
          onClick={() => window.open(googleMapsUrl(db), '_blank', 'noopener')}
          distanceLabel={overlay.transit_en}
          distanceIcon={
            <Footprints size={14} className="text-teal-700" aria-hidden="true" />
          }
          note={note || undefined}
        />
        <div className="absolute end-3 top-3">
          <SaveToggle placeId={db.id} slug={slug} lang={lang} />
        </div>
      </div>
    );
  }

  // PRAYER spots, and FOOD without a DB match → dedicated overlay card.
  const name = db ? localized(db, 'name', lang) : overlay.name_en;
  const directions = db ? googleMapsUrl(db) : overlayDirectionsUrl(overlay.name_en);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-stone-900">{name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {/* Type + provenance — prayer trust contract (D7). */}
            {isPrayer && overlay.prayerType && (
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-emerald-900">
                <ShieldCheck size={12} aria-hidden="true" />
                {sp[`prayer_${overlay.prayerType}` as const][lang]}
              </span>
            )}
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
              {sp.community_listed[lang]}
            </span>
            {overlay.alcohol && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-800">
                <Wine size={12} aria-hidden="true" />
                {sp.serves_alcohol[lang]}
              </span>
            )}
            {overlay.vegan && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-800">
                <Leaf size={12} aria-hidden="true" />
                {sp.vegan_no_cert[lang]}
              </span>
            )}
            {db?.discount_code && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                <Tag size={12} aria-hidden="true" />
                {sp.offer_valid_today[lang]}
              </span>
            )}
          </div>
        </div>
        {db && (
          <div className="shrink-0">
            <SaveToggle placeId={db.id} slug={slug} lang={lang} />
          </div>
        )}
      </div>

      <TransitLine spot={spot} lang={lang} />

      {isPrayer && overlay.access_en && (
        <p className="flex items-start gap-1.5 text-xs text-stone-600">
          <Users size={14} className="mt-0.5 shrink-0 text-stone-500" aria-hidden="true" />
          <span>{overlay.access_en}</span>
        </p>
      )}
      {isPrayer && overlay.jummah_en && (
        <p className="flex items-center gap-1.5 text-xs text-stone-600">
          <Moon size={14} className="text-stone-500" aria-hidden="true" />
          <span>{overlay.jummah_en}</span>
        </p>
      )}
      {overlay.note_en && <p className="text-xs text-stone-500">{overlay.note_en}</p>}

      <a
        href={directions}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          /* directions tap — analytics handled at the page level if needed */
        }}
        className="mt-1 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 font-medium text-white hover:bg-emerald-800 active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 motion-safe:transition-all motion-safe:duration-150"
      >
        <Navigation size={16} aria-hidden="true" />
        <span>{sp.directions[lang]}</span>
      </a>
    </div>
  );
}

// Re-export so callers needing the synthetic Location type stay co-located.
export type { Location };
