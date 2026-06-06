'use client';

import { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import type { Lang } from '@/lib/types';
import { ta } from '@/i18n/admin';
import { supabase } from '@/lib/supabase';

interface ClaimRequest {
  id: string;
  requester_uid: string;
  location_id: string;
  status: 'pending' | 'approved' | 'rejected';
  note: string | null;
  created_at: string;
}

interface ClaimsAdminProps {
  lang: Lang;
}

export function ClaimsAdmin({ lang }: ClaimsAdminProps) {
  const [claims, setClaims] = useState<ClaimRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadClaims();
  }, []);

  async function loadClaims() {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('claim_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // If table doesn't exist yet, show no claims message
        if (error.code === '42P01') {
          setClaims([]);
          setError(null);
        } else {
          throw error;
        }
      } else {
        setClaims(data ?? []);
      }
    } catch (err) {
      console.error('Failed to load claims:', err);
      setError(ta.errorOccurred[lang]);
    } finally {
      setLoading(false);
    }
  }

  async function updateClaimStatus(id: string, status: 'approved' | 'rejected') {
    try {
      const { error } = await supabase
        .from('claim_requests')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      setClaims((prev) =>
        prev.map((claim) => (claim.id === id ? { ...claim, status } : claim))
      );
    } catch (err) {
      console.error('Failed to update claim:', err);
      alert(ta.errorOccurred[lang]);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-stone-600">{ta.loading[lang]}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-6 border border-stone-200">
        <p className="text-stone-600">{error}</p>
      </div>
    );
  }

  const pendingClaims = claims.filter((c) => c.status === 'pending');

  return (
    <div>
      <h2 className="text-xl font-semibold text-stone-900 mb-4">{ta.claimsTitle[lang]}</h2>

      {pendingClaims.length === 0 ? (
        <div className="bg-white rounded-lg p-6 border border-stone-200">
          <p className="text-stone-600">{ta.noClaims[lang]}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingClaims.map((claim) => (
            <ClaimCard
              key={claim.id}
              claim={claim}
              lang={lang}
              onApprove={() => updateClaimStatus(claim.id, 'approved')}
              onReject={() => updateClaimStatus(claim.id, 'rejected')}
            />
          ))}
        </div>
      )}

      {/* Show processed claims */}
      {claims.filter((c) => c.status !== 'pending').length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-stone-900 mb-4">Processed Claims</h3>
          <div className="space-y-4">
            {claims
              .filter((c) => c.status !== 'pending')
              .map((claim) => (
                <ClaimCard
                  key={claim.id}
                  claim={claim}
                  lang={lang}
                  readonly
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ClaimCard({
  claim,
  lang,
  onApprove,
  onReject,
  readonly = false,
}: {
  claim: ClaimRequest;
  lang: Lang;
  onApprove?: () => void;
  onReject?: () => void;
  readonly?: boolean;
}) {
  const statusColors = {
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-red-100 text-red-800',
  };

  const statusLabel = {
    pending: ta.claimsPending[lang],
    approved: ta.claimsApproved[lang],
    rejected: ta.claimsRejected[lang],
  };

  return (
    <div className="bg-white rounded-lg p-4 border border-stone-200">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1">
          <p className="text-sm text-stone-600">
            <span className="font-medium">{ta.requester[lang]}:</span> {claim.requester_uid}
          </p>
          <p className="text-sm text-stone-600">
            <span className="font-medium">{ta.location[lang]}:</span> {claim.location_id}
          </p>
          {claim.note && (
            <p className="text-sm text-stone-600 mt-2">
              <span className="font-medium">{ta.note[lang]}:</span> {claim.note}
            </p>
          )}
          <p className="text-xs text-stone-500 mt-2">
            {ta.createdAt[lang]}: {new Date(claim.created_at).toLocaleString()}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[claim.status]}`}>
          {statusLabel[claim.status]}
        </span>
      </div>

      {!readonly && onApprove && onReject && (
        <div className="flex gap-2 pt-2 border-t border-stone-200">
          <button
            onClick={onApprove}
            className="px-4 py-2 text-sm bg-emerald-700 text-white rounded hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 ring-teal-600 transition-colors motion-safe:duration-150 cursor-pointer flex items-center gap-2"
          >
            <Check size={16} />
            {ta.approve[lang]}
          </button>
          <button
            onClick={onReject}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus-visible:ring-2 ring-teal-600 transition-colors motion-safe:duration-150 cursor-pointer flex items-center gap-2"
          >
            <X size={16} />
            {ta.reject[lang]}
          </button>
        </div>
      )}
    </div>
  );
}
