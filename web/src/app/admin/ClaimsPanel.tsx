'use client';

import { useState, useEffect, useCallback } from 'react';
import { Check, X, Inbox, AlertCircle, MapPin, User } from 'lucide-react';
import type { Lang, ClaimRequest } from '@/lib/types';
import { ta } from '@/i18n/admin';
import { supabase } from '@/lib/supabase';
import { listClaims, approveClaim, rejectClaim } from '@/lib/admin';

interface ClaimsPanelProps {
  lang: Lang;
  accessToken: string;
}

type Status = 'idle' | 'loading' | 'error';

/**
 * The server action may enrich each pending claim with display fields
 * (requester email, target location name). We render those when present
 * and fall back to the raw ids otherwise.
 */
type ClaimRow = ClaimRequest & {
  requester_email?: string | null;
  location_name?: string | null;
};

export function ClaimsPanel({ lang, accessToken }: ClaimsPanelProps) {
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [status, setStatus] = useState<Status>('loading');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const rows = ((await listClaims(accessToken, 'pending')) ?? []) as ClaimRow[];

      // Enrich target-location display names from the public locations table
      // (public read per RLS). Requester emails live behind profiles RLS and
      // are not client-readable, so those fall back to the uid.
      const locationIds = Array.from(new Set(rows.map((r) => r.location_id)));
      const names = new Map<string, string>();
      if (locationIds.length > 0) {
        const { data } = await supabase
          .from('locations')
          .select('id, name_en')
          .in('id', locationIds);
        for (const loc of data ?? []) {
          names.set(loc.id as string, loc.name_en as string);
        }
      }

      setClaims(
        rows.map((r) => ({
          ...r,
          location_name: r.location_name ?? names.get(r.location_id) ?? null,
        }))
      );
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  function removeClaim(id: string) {
    setClaims((prev) => prev.filter((c) => c.id !== id));
  }

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

  if (claims.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <div className="flex flex-col items-center gap-3 text-center text-stone-600">
          <Inbox size={40} className="text-stone-400" aria-hidden="true" />
          <p>{ta.no_claims[lang]}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-stone-700 px-1">
        {ta.claims_queue[lang]}
      </h2>
      <ul className="space-y-3">
        {claims.map((claim) => (
          <ClaimCard
            key={claim.id}
            claim={claim}
            lang={lang}
            accessToken={accessToken}
            onResolved={() => removeClaim(claim.id)}
          />
        ))}
      </ul>
    </div>
  );
}

interface ClaimCardProps {
  claim: ClaimRow;
  lang: Lang;
  accessToken: string;
  onResolved: () => void;
}

type CardState = 'idle' | 'working' | 'rejecting' | 'error';

function ClaimCard({ claim, lang, accessToken, onResolved }: ClaimCardProps) {
  const [cardState, setCardState] = useState<CardState>('idle');
  const [reason, setReason] = useState('');

  async function handleApprove() {
    setCardState('working');
    try {
      await approveClaim(accessToken, claim.id);
      onResolved();
    } catch {
      setCardState('error');
    }
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault();
    setCardState('working');
    try {
      await rejectClaim(accessToken, claim.id, reason.trim() || undefined);
      onResolved();
    } catch {
      setCardState('error');
    }
  }

  const working = cardState === 'working';

  return (
    <li className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
      <div className="space-y-1.5 mb-4">
        <div className="flex items-center gap-2 text-sm text-stone-700">
          <User size={16} className="text-stone-400 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {claim.requester_email || claim.requester_uid}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-stone-700">
          <MapPin size={16} className="text-stone-400 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {claim.location_name || claim.location_id}
          </span>
        </div>
        {claim.note && (
          <p className="text-sm text-stone-500 pt-1">{claim.note}</p>
        )}
        <p className="text-xs text-stone-400">
          {new Date(claim.created_at).toLocaleString()}
        </p>
      </div>

      {cardState === 'rejecting' ? (
        <form onSubmit={handleReject} className="space-y-3">
          <label
            htmlFor={`reason-${claim.id}`}
            className="block text-sm font-medium text-stone-900"
          >
            {ta.reject_reason[lang]}
          </label>
          <input
            id={`reason-${claim.id}`}
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
            className="w-full h-11 px-3 border border-stone-300 rounded-lg focus:outline-none focus-visible:ring-2 ring-teal-600 transition-shadow motion-safe:duration-150"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={working}
              className="flex-1 h-11 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 ring-red-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all motion-safe:duration-150"
            >
              <X size={18} />
              {working ? ta.saving[lang] : ta.reject[lang]}
            </button>
            <button
              type="button"
              onClick={() => setCardState('idle')}
              className="h-11 px-4 bg-stone-100 hover:bg-stone-200 text-stone-900 font-medium rounded-lg cursor-pointer focus:outline-none focus-visible:ring-2 ring-teal-600 active:scale-[0.98] transition-all motion-safe:duration-150"
            >
              {ta.cancel[lang]}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={handleApprove}
            disabled={working}
            className="flex-1 h-11 px-4 bg-teal-700 hover:bg-emerald-800 text-white font-medium rounded-lg flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 ring-teal-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all motion-safe:duration-150"
          >
            <Check size={18} />
            {ta.approve[lang]}
          </button>
          <button
            onClick={() => setCardState('rejecting')}
            disabled={working}
            className="flex-1 h-11 px-4 bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 font-medium rounded-lg flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 ring-teal-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all motion-safe:duration-150"
          >
            <X size={18} />
            {ta.reject[lang]}
          </button>
        </div>
      )}

      {cardState === 'error' && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {ta.error[lang]}
        </p>
      )}
    </li>
  );
}
