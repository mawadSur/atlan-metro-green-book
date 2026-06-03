'use client';

import { useState, useEffect } from 'react';
import { Save, LogOut, Store, Check } from 'lucide-react';
import type { Lang } from '@/lib/types';
import { tp } from '@/i18n/portal';
import { supabase } from '@/lib/supabase';
import { signOut } from '@/lib/auth';

interface LocationEditorProps {
  lang: Lang;
  userId: string;
  email: string;
  onSignOut: () => void;
}

interface LocationData {
  id: string;
  name_en: string;
  discount_code: string | null;
  discount_offer_en: string;
  discount_offer_ar: string;
  discount_offer_es: string;
  image_url: string;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function LocationEditor({ lang, userId, email, onSignOut }: LocationEditorProps) {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const [discountCode, setDiscountCode] = useState('');
  const [offerEn, setOfferEn] = useState('');
  const [offerAr, setOfferAr] = useState('');
  const [offerEs, setOfferEs] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    async function loadLocation() {
      try {
        const { data: business, error: bizError } = await supabase
          .from('businesses')
          .select('claimed_location_id')
          .eq('uid', userId)
          .single();

        if (bizError || !business?.claimed_location_id) {
          setLoading(false);
          return;
        }

        const { data: loc, error: locError } = await supabase
          .from('locations')
          .select('id, name_en, discount_code, discount_offer_en, discount_offer_ar, discount_offer_es, image_url')
          .eq('id', business.claimed_location_id)
          .single();

        if (locError) {
          setLoading(false);
          return;
        }

        setLocation(loc);
        setDiscountCode(loc.discount_code ?? '');
        setOfferEn(loc.discount_offer_en);
        setOfferAr(loc.discount_offer_ar);
        setOfferEs(loc.discount_offer_es);
        setImageUrl(loc.image_url);
      } finally {
        setLoading(false);
      }
    }

    loadLocation();
  }, [userId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!location) return;

    setSaveState('saving');
    try {
      const { error } = await supabase
        .from('locations')
        .update({
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
    try {
      await signOut();
      onSignOut();
    } catch {
      // Silent fail
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <div className="h-32 flex items-center justify-center text-stone-600">
          Loading...
        </div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center gap-4">
          <Store size={48} className="text-stone-400" />
          <p className="text-stone-600">{tp.noClaim[lang]}</p>
          <button
            onClick={handleSignOut}
            className="mt-4 h-11 px-4 bg-stone-100 hover:bg-stone-200 text-stone-900 font-medium rounded-lg flex items-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 ring-teal-600 active:scale-[0.98] transition-all motion-safe:duration-150"
          >
            <LogOut size={20} />
            {tp.signOut[lang]}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-stone-600 mb-1">{tp.yourLocation[lang]}</p>
          <h2 className="text-lg font-semibold text-stone-900">{location.name_en}</h2>
        </div>
        <button
          onClick={handleSignOut}
          aria-label={tp.signOut[lang]}
          className="h-11 px-4 bg-stone-100 hover:bg-stone-200 text-stone-900 font-medium rounded-lg flex items-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 ring-teal-600 active:scale-[0.98] transition-all motion-safe:duration-150"
        >
          <LogOut size={20} />
          <span className="hidden sm:inline">{tp.signOut[lang]}</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label htmlFor="discount_code" className="block text-sm font-medium text-stone-900 mb-1">
            {tp.discountCode[lang]}
          </label>
          <input
            id="discount_code"
            type="text"
            value={discountCode}
            onChange={(e) => setDiscountCode(e.target.value)}
            placeholder="GREENBOOK20"
            className="w-full h-11 px-3 border border-stone-300 rounded-lg focus:outline-none focus-visible:ring-2 ring-teal-600 transition-shadow motion-safe:duration-150"
          />
        </div>

        <div>
          <label htmlFor="offer_en" className="block text-sm font-medium text-stone-900 mb-1">
            {tp.offerEn[lang]}
          </label>
          <input
            id="offer_en"
            type="text"
            value={offerEn}
            onChange={(e) => setOfferEn(e.target.value)}
            className="w-full h-11 px-3 border border-stone-300 rounded-lg focus:outline-none focus-visible:ring-2 ring-teal-600 transition-shadow motion-safe:duration-150"
          />
        </div>

        <div>
          <label htmlFor="offer_ar" className="block text-sm font-medium text-stone-900 mb-1">
            {tp.offerAr[lang]}
          </label>
          <input
            id="offer_ar"
            type="text"
            dir="rtl"
            value={offerAr}
            onChange={(e) => setOfferAr(e.target.value)}
            className="w-full h-11 px-3 border border-stone-300 rounded-lg focus:outline-none focus-visible:ring-2 ring-teal-600 transition-shadow motion-safe:duration-150"
          />
        </div>

        <div>
          <label htmlFor="offer_es" className="block text-sm font-medium text-stone-900 mb-1">
            {tp.offerEs[lang]}
          </label>
          <input
            id="offer_es"
            type="text"
            value={offerEs}
            onChange={(e) => setOfferEs(e.target.value)}
            className="w-full h-11 px-3 border border-stone-300 rounded-lg focus:outline-none focus-visible:ring-2 ring-teal-600 transition-shadow motion-safe:duration-150"
          />
        </div>

        <div>
          <label htmlFor="image_url" className="block text-sm font-medium text-stone-900 mb-1">
            {tp.imageUrl[lang]}
          </label>
          <input
            id="image_url"
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            className="w-full h-11 px-3 border border-stone-300 rounded-lg focus:outline-none focus-visible:ring-2 ring-teal-600 transition-shadow motion-safe:duration-150"
          />
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
