// Match-day plan page — /match/[slug]. (Features 1 + 2: the viral spine.)
//
// This is a STATIC RSC. It runs no request-time APIs in the render path
// (no cookies()/headers()/searchParams), so it stays CDN-cacheable under ISR
// — the page must paint instantly on dead stadium mobile data. The Supabase
// read uses the anon client and is wrapped so a fetch failure can NEVER break
// the static build or the live page (the STADIUM_SPOTS overlay carries enough
// to render). All interactivity + the EN/AR/ES language toggle live in the
// MatchPlan client island.
//
// Next 16 notes (verified against node_modules/next/dist/docs):
//  - `params` is a Promise → await it.
//  - `dynamicParams = false` → unknown slugs 404 at routing (no DB hit).
//  - `revalidate = 300` → ISR; valid because Cache Components is NOT enabled.

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { Lang, Location } from '@/lib/types';
import { MATCHES, getMatch, type Match } from '@/lib/matches';
import { getLocations } from '@/lib/supabase';
import { buildMatchVM } from '@/components/match/viewModel';
import MatchPlan, { type TeamLabels } from '@/components/match/MatchPlan';

export const dynamicParams = false;
export const revalidate = 300;

export function generateStaticParams() {
  return MATCHES.map((mt) => ({ slug: mt.slug }));
}

/** Localized team/stage labels passed to the client island. */
function teamLabels(match: Match): TeamLabels {
  const name = (n: { name_en: string; name_ar: string; name_es: string }): Record<Lang, string> => ({
    en: n.name_en,
    ar: n.name_ar,
    es: n.name_es,
  });
  return {
    home: { flag: match.home.flag, name: name(match.home) },
    away: { flag: match.away.flag, name: name(match.away) },
    stage: { en: match.stage_en, ar: match.stage_ar, es: match.stage_en },
  };
}

/** Atlanta DB rows, never throwing — Supabase failure falls back to []. */
async function safeLocations(): Promise<Location[]> {
  try {
    return await getLocations('atlanta', { limit: 500 });
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const match = getMatch(slug);
  if (!match) return {};

  const title = `${match.home.name_en} v ${match.away.name_en} — Halal & Prayer Plan | Atlanta`;
  const description = `Your match-day halal food + prayer plan for ${match.home.name_en} v ${match.away.name_en} at Mercedes-Benz Stadium, Atlanta. Walkable halal spots, the nearest masjid, and prayer times around kickoff — built for World Cup 2026.`;

  return {
    title,
    description,
    openGraph: { title, description, type: 'article' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function MatchPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const match = getMatch(slug);
  if (!match) notFound();

  const locs = await safeLocations();
  const vm = buildMatchVM(match, locs);

  return <MatchPlan vm={vm} teams={teamLabels(match)} />;
}
