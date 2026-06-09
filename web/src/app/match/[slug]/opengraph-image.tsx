// Per-match Open Graph share card (1200x630 PNG).
//
// This is the top of the funnel: the image 50 people in a group chat see before
// anyone taps the link. Goals, in priority order:
//   1. Flags DOMINANT in the top third — the only thing recognized in 200ms of scroll.
//   2. ONE benefit headline, Arabic-first ("حلال موثّق ومصلّى قرب الملعب"), with an
//      embedded Noto Sans Arabic font so Satori shapes the script correctly.
//   3. Teams + kickoff (America/New_York) + a green ✓ "Verified" mark on the bottom row.
//
// Build-safety: the Arabic + Latin fonts are vendored locally (no network fetch),
// so builds are deterministic and offline-safe. Every card ships with both fonts.
//
// Next 16 notes (read node_modules/next/dist/docs/.../opengraph-image.md):
//   - `params` is now a Promise (v16.0.0) — must be awaited.
//   - next/og dropped the edge default; this route uses the Node runtime so it can
//     read fonts from disk at build time.
//   - generateStaticParams + dynamicParams=false => only the 4 known slugs render
//     (others 404), so all cards are pre-rendered at build time.
//
// Satori gotcha (verified by rendering test PNGs): when both a Latin and an Arabic
// font are registered, the Arabic glyph lookup crashes (`charToGlyphIndex` reads an
// undefined cmap) UNLESS the Latin font is listed FIRST. Order is load-bearing.

import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MATCHES, getMatch, type Match, type MatchTeam } from '@/lib/matches';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Verified halal + prayer near Atlanta Stadium';

// Only the four known matches get a card. Unknown slugs 404 (no request-time render).
export const dynamicParams = false;

export function generateStaticParams() {
  return MATCHES.map((m) => ({ slug: m.slug }));
}

// Brand palette (web/DESIGN.md).
const EMERALD = '#065f46';
const TEAL = '#0f766e';
const AMBER = '#ca8a04';
const ARABIC_HEADLINE = 'حلال موثّق ومصلّى قرب الملعب';
const ENGLISH_HEADLINE = 'Verified halal + prayer near Atlanta Stadium';

// Vendored TTFs (hinted Noto from the googlefonts/noto-fonts repo). ttf/otf are
// preferred over woff for Satori parse speed. Bold weights for thumbnail legibility.
// Loaded from disk at build time for deterministic, offline-safe builds.
// Path is relative to web/ directory (process.cwd() during Next.js build).
const FONT_LATIN = readFileSync(
  join(process.cwd(), 'src/app/match/[slug]/_fonts/NotoSans-Bold.ttf')
);
const FONT_ARABIC = readFileSync(
  join(process.cwd(), 'src/app/match/[slug]/_fonts/NotoSansArabic-Bold.ttf')
);

/** "Sun, Jun 21 • 12:00 PM ET" in America/New_York, regardless of build host TZ. */
function formatKickoff(m: Match): string {
  const d = new Date(m.kickoff);
  const date = new Intl.DateTimeFormat('en-US', {
    timeZone: m.venueTz,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(d);
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: m.venueTz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
  return `${date}  •  ${time} ET`;
}

function teamsLine(m: Match): string {
  return `${m.home.name_en} v ${m.away.name_en}`;
}

/** A CSS-drawn checkmark (rotated borders) — avoids depending on a ✓ glyph/emoji. */
function CheckMark() {
  return (
    <div
      style={{
        display: 'flex',
        width: 22,
        height: 11,
        borderLeft: '5px solid #bbf7d0',
        borderBottom: '5px solid #bbf7d0',
        transform: 'rotate(-45deg)',
        marginBottom: 6,
      }}
    />
  );
}

function VerifiedPill() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: TEAL,
        borderRadius: 999,
        padding: '14px 26px',
      }}
    >
      <CheckMark />
      <div style={{ display: 'flex', fontSize: 28, color: 'white', fontWeight: 700 }}>
        Verified
      </div>
    </div>
  );
}

function FlagBlock({ team }: { team: MatchTeam }) {
  // Flag emoji rasterizes via Satori's built-in Twemoji handling.
  return <div style={{ display: 'flex', fontSize: 150, lineHeight: 1 }}>{team.flag}</div>;
}

function BottomRow({ m }: { m: Match }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: '2px solid rgba(255,255,255,0.18)',
        paddingTop: 22,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', fontSize: 38, color: 'white', fontWeight: 700 }}>
          {teamsLine(m)}
        </div>
        <div style={{ display: 'flex', fontSize: 28, color: '#86efac', marginTop: 4 }}>
          {formatKickoff(m)}
        </div>
      </div>
      <VerifiedPill />
    </div>
  );
}

/** Outer frame shared by every card variant: amber accent bar + emerald canvas. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        background: EMERALD,
        padding: '64px 72px 56px',
        fontFamily: 'NotoLatin',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 14,
          background: AMBER,
        }}
      />
      {children}
    </div>
  );
}

function FlagsZone({ m }: { m: Match }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 56 }}>
      <FlagBlock team={m.home} />
      <div style={{ display: 'flex', fontSize: 60, color: '#fcd34d', fontWeight: 700 }}>VS</div>
      <FlagBlock team={m.away} />
    </div>
  );
}

// Full Arabic-first card.
function ArabicCard({ m }: { m: Match }) {
  return (
    <Frame>
      <FlagsZone m={m} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div
          style={{
            display: 'flex',
            fontFamily: 'NotoArabic',
            direction: 'rtl',
            fontSize: 72,
            color: 'white',
            fontWeight: 700,
            textAlign: 'center',
            lineHeight: 1.35,
          }}
        >
          {ARABIC_HEADLINE}
        </div>
        <div style={{ display: 'flex', fontSize: 34, color: '#a7f3d0', marginTop: 14 }}>
          {ENGLISH_HEADLINE}
        </div>
      </div>
      <BottomRow m={m} />
    </Frame>
  );
}

// English-only card — used when the Arabic font fetch fails. Still flags + kickoff +
// Verified, just a bigger English hero in place of the Arabic line.
function EnglishCard({ m }: { m: Match }) {
  return (
    <Frame>
      <FlagsZone m={m} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div
          style={{
            display: 'flex',
            fontSize: 62,
            color: 'white',
            fontWeight: 700,
            textAlign: 'center',
            lineHeight: 1.2,
          }}
        >
          {ENGLISH_HEADLINE}
        </div>
        <div style={{ display: 'flex', fontSize: 32, color: '#a7f3d0', marginTop: 14 }}>
          Find it before kickoff
        </div>
      </div>
      <BottomRow m={m} />
    </Frame>
  );
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // dynamicParams=false guarantees slug is one of the four, but guard anyway.
  const match = getMatch(slug) ?? MATCHES[0];

  // Arabic-first card with both fonts embedded (Latin FIRST — see header note).
  // Fonts are vendored locally, so no network fetch or fallback tiers needed.
  return new ImageResponse(<ArabicCard m={match} />, {
    ...size,
    fonts: [
      { name: 'NotoLatin', data: FONT_LATIN, weight: 700, style: 'normal' },
      { name: 'NotoArabic', data: FONT_ARABIC, weight: 700, style: 'normal' },
    ],
  });
}
