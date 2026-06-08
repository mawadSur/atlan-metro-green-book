'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Store, Check, Clock, LogOut } from 'lucide-react';
import type { Lang } from '@/lib/types';
import { tp } from '@/i18n/portal';
import { supabase } from '@/lib/supabase';

interface ClaimFormProps {
  lang: Lang;
  userId: string;
  onSignOut: () => void;
  signOutError?: boolean;
}

interface SearchResult {
  id: string;
  name_en: string;
  name_ar: string;
  name_es: string;
  address: string;
}

type SearchState = 'idle' | 'searching' | 'done' | 'error';
type SubmitState = 'idle' | 'submitting' | 'submitted' | 'error';

function nameFor(loc: SearchResult, lang: Lang): string {
  if (lang === 'ar') return loc.name_ar || loc.name_en;
  if (lang === 'es') return loc.name_es || loc.name_en;
  return loc.name_en;
}

export function ClaimForm({ lang, onSignOut, signOutError }: ClaimFormProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [note, setNote] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (selected) return; // don't search while a selection is locked in

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (trimmed.length < 2) {
      setResults([]);
      setSearchState('idle');
      return;
    }

    setSearchState('searching');
    debounceRef.current = setTimeout(async () => {
      // Escape PostgREST `ilike` wildcards in user input.
      const safe = trimmed.replace(/[%_,]/g, (m) => `\\${m}`);
      const { data, error } = await supabase
        .from('locations')
        .select('id, name_en, name_ar, name_es, address')
        .or(`name_en.ilike.%${safe}%,name_ar.ilike.%${safe}%,name_es.ilike.%${safe}%`)
        .order('name_en')
        .limit(20);

      if (error) {
        setSearchState('error');
        setResults([]);
        return;
      }
      setResults((data ?? []) as SearchResult[]);
      setSearchState('done');
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selected]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSubmitState('submitting');
    // requester_uid is enforced by RLS WITH CHECK (auth.uid() = requester_uid);
    // we use auth.uid() via the session so the row is attributed correctly.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSubmitState('error');
      return;
    }
    const { error } = await supabase.from('claim_requests').insert({
      requester_uid: user.id,
      location_id: selected.id,
      note: note.trim() || null,
    });
    if (error) {
      setSubmitState('error');
      return;
    }
    setSubmitState('submitted');
  }

  if (submitState === 'submitted') {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center gap-4">
          <Check size={48} className="text-green-600" />
          <p className="text-stone-700" role="status" aria-live="polite">
            {tp.claimSubmitted[lang]}
          </p>
          <SignOutButton lang={lang} onSignOut={onSignOut} signOutError={signOutError} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-stone-900">{tp.claimTitle[lang]}</h2>
        <SignOutButton lang={lang} onSignOut={onSignOut} signOutError={signOutError} compact />
      </div>
      <p className="text-stone-600 text-sm mb-6">{tp.claimIntro[lang]}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {selected ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-teal-200 bg-teal-50 p-3">
            <div className="min-w-0">
              <p className="text-xs text-teal-700">{tp.selectedLocation[lang]}</p>
              <p className="font-medium text-stone-900 truncate">{nameFor(selected, lang)}</p>
              <p className="text-sm text-stone-600 truncate">{selected.address}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setSubmitState('idle');
              }}
              className="shrink-0 h-9 px-3 text-sm bg-white border border-stone-300 hover:bg-stone-100 text-stone-900 rounded-lg cursor-pointer focus:outline-none focus-visible:ring-2 ring-teal-600 transition-colors motion-safe:duration-150"
            >
              {tp.changeSelection[lang]}
            </button>
          </div>
        ) : (
          <div>
            <label htmlFor="claim_search" className="block text-sm font-medium text-stone-900 mb-1">
              {tp.searchLocations[lang]}
            </label>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              <input
                id="claim_search"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tp.searchPlaceholder[lang]}
                aria-describedby="claim_search_status"
                className="w-full h-11 pl-10 pr-3 border border-stone-300 rounded-lg focus:outline-none focus-visible:ring-2 ring-teal-600 transition-shadow motion-safe:duration-150"
              />
            </div>

            <div id="claim_search_status" aria-live="polite" className="mt-2">
              {query.trim().length > 0 && query.trim().length < 2 && (
                <p className="text-sm text-stone-500">{tp.searchTyping[lang]}</p>
              )}
              {searchState === 'searching' && (
                <p className="text-sm text-stone-500">{tp.searching[lang]}</p>
              )}
              {searchState === 'error' && (
                <p role="alert" className="text-sm text-red-600">{tp.claimError[lang]}</p>
              )}
              {searchState === 'done' && results.length === 0 && (
                <p className="text-sm text-stone-500">{tp.noResults[lang]}</p>
              )}
            </div>

            {results.length > 0 && (
              <ul className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-stone-200 divide-y divide-stone-100">
                {results.map((loc) => (
                  <li key={loc.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(loc)}
                      className="w-full text-left p-3 hover:bg-stone-50 cursor-pointer focus:outline-none focus-visible:ring-2 ring-teal-600 transition-colors motion-safe:duration-150"
                    >
                      <p className="font-medium text-stone-900">{nameFor(loc, lang)}</p>
                      <p className="text-sm text-stone-600 truncate">{loc.address}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div>
          <label htmlFor="claim_note" className="block text-sm font-medium text-stone-900 mb-1">
            {tp.claimNote[lang]}
          </label>
          <textarea
            id="claim_note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={tp.claimNotePlaceholder[lang]}
            rows={3}
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus-visible:ring-2 ring-teal-600 transition-shadow motion-safe:duration-150"
          />
        </div>

        <button
          type="submit"
          disabled={!selected || submitState === 'submitting'}
          className="w-full h-11 bg-teal-700 hover:bg-emerald-800 text-white font-medium rounded-lg flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 ring-teal-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all motion-safe:duration-150"
        >
          {submitState === 'submitting' ? (
            tp.submittingClaim[lang]
          ) : (
            <>
              <Store size={20} />
              {tp.submitClaim[lang]}
            </>
          )}
        </button>

        {submitState === 'error' && (
          <div role="alert" aria-live="polite" className="text-sm text-red-600">
            {tp.claimError[lang]}
          </div>
        )}
      </form>
    </div>
  );
}

export function ClaimPending({
  lang,
  onSignOut,
  signOutError,
}: {
  lang: Lang;
  onSignOut: () => void;
  signOutError?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
      <div className="flex flex-col items-center text-center gap-4">
        <Clock size={48} className="text-amber-500" />
        <h2 className="text-lg font-semibold text-stone-900">{tp.claimPendingTitle[lang]}</h2>
        <p className="text-stone-600">{tp.claimPendingBody[lang]}</p>
        <SignOutButton lang={lang} onSignOut={onSignOut} signOutError={signOutError} />
      </div>
    </div>
  );
}

function SignOutButton({
  lang,
  onSignOut,
  signOutError,
  compact,
}: {
  lang: Lang;
  onSignOut: () => void;
  signOutError?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={compact ? '' : 'flex flex-col items-center gap-2'}>
      <button
        onClick={onSignOut}
        aria-label={tp.signOut[lang]}
        className="h-11 px-4 bg-stone-100 hover:bg-stone-200 text-stone-900 font-medium rounded-lg flex items-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 ring-teal-600 active:scale-[0.98] transition-all motion-safe:duration-150"
      >
        <LogOut size={20} />
        <span className={compact ? 'hidden sm:inline' : ''}>{tp.signOut[lang]}</span>
      </button>
      {signOutError && (
        <div role="alert" className="text-sm text-red-600">
          {tp.signOutError[lang]}
        </div>
      )}
    </div>
  );
}
