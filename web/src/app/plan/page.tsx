// "My match-day plan" — the shared save-list view (Feature 3 / T8).
//
// A fan saves ♡ spots across match pages, taps "Share my plan", and sends a
// /plan?saved=<base64url> link. This route decodes that token (server-side, the
// hard trust boundary in saveList.decodeSavedIds) and renders the saved spots.
//
// Rendering: this page reads searchParams, so it is dynamic by design (NOT the
// spike-proof static match page) — that's fine, plan links are low-volume and
// personal. decodeSavedIds caps + validates ids, so a hostile ?saved= blob is
// rejected to [] rather than trusted or crashing the route.

import type { Metadata } from 'next';
import type { Location } from '@/lib/types';
import { decodeSavedIds } from '@/lib/saveList';
import { getLocationsByIds } from '@/lib/supabase';
import PlanView from './PlanView';

export const metadata: Metadata = {
  title: 'My Match-Day Plan — Atlan Metro Green Book',
  description:
    'A shared halal + prayer plan for the matches in Atlanta — verified spots near Mercedes-Benz Stadium.',
};

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string | string[] }>;
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.saved) ? sp.saved[0] : sp.saved;
  const ids = decodeSavedIds(raw ?? '');

  let locations: Location[] = [];
  try {
    locations = await getLocationsByIds(ids);
  } catch {
    // A Supabase failure renders the empty-plan state, never a crashed route.
    locations = [];
  }

  return <PlanView locations={locations} />;
}
