'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save, LogOut, Check, RotateCcw } from 'lucide-react';
import type { Lang } from '@/lib/types';
import { tp } from '@/i18n/portal';
import { supabase } from '@/lib/supabase';
import { signOut } from '@/lib/auth';
import { ClaimForm, ClaimPending } from './ClaimForm';

interface LocationEditorProps {
  lang: Lang;
  userId: string;
  email: string;
  onSignOut: () => void;
}

// The full owner-editable column set granted in migration 0002.
// NEVER includes halal_status / verified_by / verified_at (admin-only).
interface LocationData {
  id: string;
  name_en: string;
  name_ar: string;
  name_es: string;
  address: string;
  phone: string;
  hours_en: string;
  hours_ar: string;
  hours_es: string;
  alcohol_free: boolean;
  prayer_space: boolean;
  family_friendly: boolean;
  worldcup_special: boolean;
  discount_code: string | null;
  discount_offer_en: string;
  discount_offer_ar: string;
  discount_offer_es: string;
  image_url: string;
}

const OWNER_COLUMNS =
  'id, name_en, name_ar, name_es, address, phone, hours_en, hours_ar, hours_es, ' +
  'alcohol_free, prayer_space, family_friendly, worldcup_special, ' +
  'discount_code, discount_offer_en, discount_offer_ar, discount_offer_es, image_url';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
// 'noBusiness' = genuine empty state (no claim); 'error' = real load/RLS/network failure.
type LoadState = 'loading' | 'ready' | 'noBusiness' | 'pendingClaim' | 'error';

export function LocationEditor({ lang, userId, onSignOut }: LocationEditorProps) {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [signOutError, setSignOutError] = useState(false);

  // Form fields
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [nameEs, setNameEs] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [hoursEn, setHoursEn] = useState('');
  const [hoursAr, setHoursAr] = useState('');
  const [hoursEs, setHoursEs] = useState('');
  const [alcoholFree, setAlcoholFree] = useState(false);
  const [prayerSpace, setPrayerSpace] = useState(false);
  const [familyFriendly, setFamilyFriendly] = useState(false);
  const [worldcupSpecial, setWorldcupSpecial] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [offerEn, setOfferEn] = useState('');
  const [offerAr, setOfferAr] = useState('');
  const [offerEs, setOfferEs] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const loadLocation = useCallback(async () => {
    setLoadState('loading');

    // Is a business linked to this account?
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('claimed_location_id')
      .eq('uid', userId)
      .maybeSingle();

    // A real query failure (network / RLS / server) is NOT the same as "no row".
    if (bizError) {
      setLoadState('error');
      return;
    }

    if (!business?.claimed_location_id) {
      // No linked business. Distinguish a pending claim from a fresh user.
      const { data: claims, error: claimError } = await supabase
        .from('claim_requests')
        .select('id')
        .eq('status', 'pending')
        .limit(1);

      if (claimError) {
        setLoadState('error');
        return;
      }
      setLoadState(claims && claims.length > 0 ? 'pendingClaim' : 'noBusiness');
      return;
    }

    const { data: loc, error: locError } = await supabase
      .from('locations')
      .select(OWNER_COLUMNS)
      .eq('id', business.claimed_location_id)
      .single();

    if (locError || !loc) {
      setLoadState('error');
      return;
    }

    const l = loc as unknown as LocationData;
    setLocation(l);
    setNameEn(l.name_en ?? '');
    setNameAr(l.name_ar ?? '');
    setNameEs(l.name_es ?? '');
    setAddress(l.address ?? '');
    setPhone(l.phone ?? '');
    setHoursEn(l.hours_en ?? '');
    setHoursAr(l.hours_ar ?? '');
    setHoursEs(l.hours_es ?? '');
    setAlcoholFree(!!l.alcohol_free);
    setPrayerSpace(!!l.prayer_space);
    setFamilyFriendly(!!l.family_friendly);
    setWorldcupSpecial(!!l.worldcup_special);
    setDiscountCode(l.discount_code ?? '');
    setOfferEn(l.discount_offer_en ?? '');
    setOfferAr(l.discount_offer_ar ?? '');
    setOfferEs(l.discount_offer_es ?? '');
    setImageUrl(l.image_url ?? '');
    setLoadState('ready');
  }, [userId]);

  useEffect(() => {
    loadLocation();
  }, [loadLocation]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!location) return;

    setSaveState('saving');
    try {
      // Only owner-editable columns. halal_status/verified_* deliberately absent.
      const { error } = await supabase
        .from('locations')
        .update({
          name_en: nameEn,
          name_ar: nameAr,
          name_es: nameEs,
          address,
          phone,
          hours_en: hoursEn,
          hours_ar: hoursAr,
          hours_es: hoursEs,
          alcohol_free: alcoholFree,
          prayer_space: prayerSpace,
          family_friendly: familyFriendly,
          worldcup_special: worldcupSpecial,
          discount_code: discountCode || null,
          discount_offer_en: offerEn,
          discount_offer_ar: offerAr,
          discount_offer_es: offerEs,
          image_url: imageUrl,
        })
        .eq('id', location.id);

      if (error) throw error;

      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch {
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 3000);
    }
  }

  async function handleSignOut() {
    setSignOutError(false);
    try {
      await signOut();
      onSignOut();
    } catch {
      setSignOutError(true);
    }
  }

  if (loadState === 'loading') {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <div className="h-32 flex items-center justify-center text-stone-600">
          Loading…
        </div>
      </div>
    );
  }

  if (loadState === 'error') {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center gap-4">
          <p role="alert" className="text-red-600">{tp.loadError[lang]}</p>
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={loadLocation}
              className="h-11 px-4 bg-teal-700 hover:bg-emerald-800 text-white font-medium rounded-lg flex items-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 ring-teal-600 active:scale-[0.98] transition-all motion-safe:duration-150"
            >
              <RotateCcw size={20} />
              {tp.retry[lang]}
            </button>
            <button
              onClick={handleSignOut}
              className="h-11 px-4 bg-stone-100 hover:bg-stone-200 text-stone-900 font-medium rounded-lg flex items-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 ring-teal-600 active:scale-[0.98] transition-all motion-safe:duration-150"
            >
              <LogOut size={20} />
              {tp.signOut[lang]}
            </button>
            {signOutError && (
              <div role="alert" className="text-sm text-red-600">{tp.signOutError[lang]}</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loadState === 'pendingClaim') {
    return <ClaimPending lang={lang} onSignOut={handleSignOut} signOutError={signOutError} />;
  }

  if (loadState === 'noBusiness' || !location) {
    return (
      <ClaimForm
        lang={lang}
        userId={userId}
        onSignOut={handleSignOut}
        signOutError={signOutError}
      />
    );
  }

  const fieldClass =
    'w-full h-11 px-3 border border-stone-300 rounded-lg focus:outline-none focus-visible:ring-2 ring-teal-600 transition-shadow motion-safe:duration-150';
  const labelClass = 'block text-sm font-medium text-stone-900 mb-1';
  const sectionClass = 'text-xs font-semibold uppercase tracking-wide text-stone-500 mt-2';

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="min-w-0">
          <p className="text-xs text-stone-600 mb-1">{tp.yourLocation[lang]}</p>
          <h2 className="text-lg font-semibold text-stone-900 truncate">{location.name_en}</h2>
        </div>
        <button
          onClick={handleSignOut}
          aria-label={tp.signOut[lang]}
          className="shrink-0 h-11 px-4 bg-stone-100 hover:bg-stone-200 text-stone-900 font-medium rounded-lg flex items-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 ring-teal-600 active:scale-[0.98] transition-all motion-safe:duration-150"
        >
          <LogOut size={20} />
          <span className="hidden sm:inline">{tp.signOut[lang]}</span>
        </button>
      </div>

      {signOutError && (
        <div role="alert" className="mb-4 text-sm text-red-600">{tp.signOutError[lang]}</div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {/* Names */}
        <p className={sectionClass}>{tp.sectionNames[lang]}</p>
        <div>
          <label htmlFor="name_en" className={labelClass}>{tp.nameEn[lang]}</label>
          <input id="name_en" type="text" value={nameEn} onChange={(e) => setNameEn(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="name_ar" className={labelClass}>{tp.nameAr[lang]}</label>
          <input id="name_ar" type="text" dir="rtl" value={nameAr} onChange={(e) => setNameAr(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="name_es" className={labelClass}>{tp.nameEs[lang]}</label>
          <input id="name_es" type="text" value={nameEs} onChange={(e) => setNameEs(e.target.value)} className={fieldClass} />
        </div>

        {/* Contact & hours */}
        <p className={sectionClass}>{tp.sectionContact[lang]}</p>
        <div>
          <label htmlFor="address" className={labelClass}>{tp.address[lang]}</label>
          <input id="address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="phone" className={labelClass}>{tp.phone[lang]}</label>
          <input id="phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="hours_en" className={labelClass}>{tp.hoursEn[lang]}</label>
          <input id="hours_en" type="text" value={hoursEn} onChange={(e) => setHoursEn(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="hours_ar" className={labelClass}>{tp.hoursAr[lang]}</label>
          <input id="hours_ar" type="text" dir="rtl" value={hoursAr} onChange={(e) => setHoursAr(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="hours_es" className={labelClass}>{tp.hoursEs[lang]}</label>
          <input id="hours_es" type="text" value={hoursEs} onChange={(e) => setHoursEs(e.target.value)} className={fieldClass} />
        </div>

        {/* Amenities (booleans) */}
        <p className={sectionClass}>{tp.sectionAmenities[lang]}</p>
        <div className="space-y-2">
          {[
            { id: 'alcohol_free', label: tp.alcoholFree[lang], checked: alcoholFree, set: setAlcoholFree },
            { id: 'prayer_space', label: tp.prayerSpace[lang], checked: prayerSpace, set: setPrayerSpace },
            { id: 'family_friendly', label: tp.familyFriendly[lang], checked: familyFriendly, set: setFamilyFriendly },
            { id: 'worldcup_special', label: tp.worldcupSpecial[lang], checked: worldcupSpecial, set: setWorldcupSpecial },
          ].map((c) => (
            <label key={c.id} htmlFor={c.id} className="flex items-center gap-3 cursor-pointer">
              <input
                id={c.id}
                type="checkbox"
                checked={c.checked}
                onChange={(e) => c.set(e.target.checked)}
                className="h-5 w-5 rounded border-stone-300 text-teal-700 focus:outline-none focus-visible:ring-2 ring-teal-600 cursor-pointer"
              />
              <span className="text-sm text-stone-900">{c.label}</span>
            </label>
          ))}
        </div>

        {/* Discount offer */}
        <p className={sectionClass}>{tp.sectionOffer[lang]}</p>
        <div>
          <label htmlFor="discount_code" className={labelClass}>{tp.discountCode[lang]}</label>
          <input id="discount_code" type="text" value={discountCode} onChange={(e) => setDiscountCode(e.target.value)} placeholder="GREENBOOK20" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="offer_en" className={labelClass}>{tp.offerEn[lang]}</label>
          <input id="offer_en" type="text" value={offerEn} onChange={(e) => setOfferEn(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="offer_ar" className={labelClass}>{tp.offerAr[lang]}</label>
          <input id="offer_ar" type="text" dir="rtl" value={offerAr} onChange={(e) => setOfferAr(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="offer_es" className={labelClass}>{tp.offerEs[lang]}</label>
          <input id="offer_es" type="text" value={offerEs} onChange={(e) => setOfferEs(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="image_url" className={labelClass}>{tp.imageUrl[lang]}</label>
          <input id="image_url" type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className={fieldClass} />
        </div>

        <button
          type="submit"
          disabled={saveState === 'saving'}
          className="w-full h-11 bg-teal-700 hover:bg-emerald-800 text-white font-medium rounded-lg flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 ring-teal-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all motion-safe:duration-150"
        >
          {saveState === 'saving' && tp.saving[lang]}
          {saveState === 'saved' && (
            <>
              <Check size={20} />
              {tp.saved[lang]}
            </>
          )}
          {(saveState === 'idle' || saveState === 'error') && (
            <>
              <Save size={20} />
              {tp.save[lang]}
            </>
          )}
        </button>

        {saveState === 'error' && (
          <div role="alert" aria-live="polite" className="text-sm text-red-600">
            {tp.saveError[lang]}
          </div>
        )}

        {saveState === 'saved' && (
          <div aria-live="polite" className="text-sm text-green-600">
            {tp.saved[lang]}
          </div>
        )}
      </form>
    </div>
  );
}
