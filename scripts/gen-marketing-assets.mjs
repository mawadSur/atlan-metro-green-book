#!/usr/bin/env node
// Marketing-asset generator — per-channel UTM links + REAL offline QR codes +
// print-ready collateral (restaurant table-tent, mosque announcement flyer,
// window sticker) for the 4 Atlanta World Cup match pages.
//
// Standalone deliverable. Output lives in web/public/print/ and is served as
// static files — it is NOT a Next.js route and does NOT touch web/src or the
// web build. The only runtime deps are the root-owned `qrcode` (encode) plus
// `jsqr` + `pngjs` (decode, for the round-trip self-check).
//
// Usage:
//   node scripts/gen-marketing-assets.mjs            # generate everything
//   node scripts/gen-marketing-assets.mjs --no-verify# skip QR decode round-trip
//
// Why the channels are split the way they are (this is the WHOLE point):
//   - PLACEMENT channels (mosque / restaurant / window / guerrilla): a physical
//     printed QR a stranger scans. utm_medium=qr. These measure COLD reach, and
//     each carries a distinct utm_source so we can tell which placement worked.
//   - SEED channels (founder's own WhatsApp status / fan-group posts): a link
//     the founder posts himself. utm_medium=social + utm_content=seed. Tagging
//     OUR seed posts with content=seed is what makes organic re-shares
//     countable: a re-share strips the UTM (or keeps source/medium but the
//     post is no longer "ours"), so seed-tagged hits = self-promotion and
//     everything else on that source = somebody else passing it on. Without
//     this split, virality is unmeasurable.
//
// Every QR is decode-verified (PNG -> jsQR) against the exact URL it should
// encode. A mismatch is logged and fails the run — a wrong QR in print is worse
// than no QR.
//
// Output (all under web/public/print/):
//   - qr/<channel>.svg + qr/<channel>.png   one real QR per channel instance
//   - table-tent.html        restaurant table-tents (one card per match)
//   - mosque-flyer.html      mosque announcement-board flyer (one card per match)
//   - window-sticker.html    storefront window stickers (one per match)
//   - match-day-flyer.html   combined every-QR contact sheet (kept, regenerated)
//   - utm-index.csv + utm-index.json   channel -> full UTM URL -> carrier asset

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PRINT_DIR = join(ROOT, 'web', 'public', 'print');
const QR_DIR = join(PRINT_DIR, 'qr');

const SITE = 'https://atlan-green-book.vercel.app';
const CAMPAIGN = 'wc2026'; // one campaign across every link, so totals roll up

// QR colors — brand-dark on white. Dark-on-light + ≥1 quiet-zone module keeps
// the code scannable; we use error-correction level Q so a printed code still
// reads with a little smudging / a logo-sized blemish.
const QR_DARK = '#065f46'; // --brand-dark (emerald-800)
const QR_LIGHT = '#ffffff';
const QR_ECC = 'Q';

// --- Kickoff times -----------------------------------------------------------
// SOURCE OF TRUTH: the verified kickoffs in web/src/lib/matches.ts (read-only).
// Mirrored here as ISO strings (with -04:00 EDT) so this generator stays
// standalone — it must not import from web/src. Keep in sync if matches.ts
// changes; the slugs below are the join key.
const KICKOFFS = {
  'spain-saudi-arabia':  '2026-06-21T12:00:00-04:00',
  'morocco-haiti':       '2026-06-24T18:00:00-04:00',
  'dr-congo-uzbekistan': '2026-06-27T19:30:00-04:00',
  'semifinal-atlanta':   '2026-07-15T15:00:00-04:00',
};

// Format an ISO kickoff into a printed caption like "Sun, Jun 21, 2026 · 12:00 PM ET".
// Computed via Intl in the America/New_York zone so the weekday is never
// hand-typed (no wrong day-of-week) and DST is handled by the zone, not by us.
const KICKOFF_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  hour: 'numeric', minute: '2-digit', hour12: true,
});
function formatKickoff(iso) {
  const parts = KICKOFF_FMT.formatToParts(new Date(iso));
  const get = (t) => parts.find((p) => p.type === t)?.value ?? '';
  const date = `${get('weekday')}, ${get('month')} ${get('day')}, ${get('year')}`;
  const time = `${get('hour')}:${get('minute')} ${get('dayPeriod')}`;
  return `${date} · ${time} ET`;
}

// --- The 4 matches -----------------------------------------------------------
// slug = canonical /match/<slug> path. fr is included because Morocco, DR Congo
// and Haiti are francophone — a French line is honest reach, not decoration.
// `date` is the computed kickoff caption (printed on every per-match card).
const MATCHES = [
  { slug: 'spain-saudi-arabia',  en: 'Spain vs Saudi Arabia',  ar: 'إسبانيا ضد السعودية',               fr: 'Espagne — Arabie saoudite' },
  { slug: 'morocco-haiti',       en: 'Morocco vs Haiti',       ar: 'المغرب ضد هايتي',                    fr: 'Maroc — Haïti' },
  { slug: 'dr-congo-uzbekistan', en: 'DR Congo vs Uzbekistan', ar: 'الكونغو الديمقراطية ضد أوزبكستان', fr: 'RD Congo — Ouzbékistan' },
  { slug: 'semifinal-atlanta',   en: 'Semifinal — Atlanta',    ar: 'نصف النهائي — أتلانتا',              fr: 'Demi-finale — Atlanta' },
].map((m) => ({ ...m, kickoff: KICKOFFS[m.slug], date: formatKickoff(KICKOFFS[m.slug]) }));

// Caption for the generic homepage QRs, which have no single match date.
const HOME_OCCASION = 'World Cup 2026 · Atlanta';

// --- Channel templates -------------------------------------------------------
// Each template is instantiated per-match (dest:'match') or once (dest:'home').
// `source` is the utm_source we attribute scans to. `seed` flips the channel to
// medium=social + utm_content=seed (a link the founder posts himself).
//
// `sourceFor(match)` lets a template vary its source by match — e.g. the
// fan-group source is per-match (fangroup_morocco vs fangroup_spain_saudi) so
// we know WHICH community shared.
const CHANNELS = [
  // ---- PLACEMENT: printed QR a stranger scans (cold reach, medium=qr) ----
  {
    id: 'mosque', dest: 'match', medium: 'qr', seed: false,
    source: 'mosque_alfarooq',
    label: 'Mosque announcement board (Al-Farooq Masjid)',
    carrier: 'mosque-flyer.html',
  },
  {
    id: 'restaurant', dest: 'match', medium: 'qr', seed: false,
    // per-restaurant source so each venue's table-tents are attributable.
    sourceFor: () => 'restaurant_aldente',
    source: 'restaurant_aldente',
    label: 'Restaurant table-tent (Al Dente Halal)',
    carrier: 'table-tent.html',
  },
  {
    id: 'window', dest: 'match', medium: 'qr', seed: false,
    source: 'window_sticker',
    label: 'Storefront window sticker',
    carrier: 'window-sticker.html',
  },
  {
    id: 'guerrilla_marta', dest: 'match', medium: 'qr', seed: false,
    source: 'guerrilla_marta',
    label: 'Guerrilla — MARTA station / transit',
    carrier: 'match-day-flyer.html',
  },
  {
    id: 'guerrilla_fanzone', dest: 'match', medium: 'qr', seed: false,
    source: 'guerrilla_fanzone',
    label: 'Guerrilla — official fan zone',
    carrier: 'match-day-flyer.html',
  },
  // ---- SEED: founder's own social posts (self-seeding, medium=social) ----
  // utm_content=seed marks these as OURS so organic re-shares are subtractable.
  {
    id: 'fangroup', dest: 'match', medium: 'social', seed: true,
    // per-match fan-group source: fangroup_spain_saudi, fangroup_morocco, …
    sourceFor: (m) => `fangroup_${m.slug.replace(/-/g, '_')}`,
    source: 'fangroup',
    label: 'SEED — country fan group (WhatsApp/Telegram), per match',
    carrier: '(digital — see utm-index)',
  },
  {
    id: 'whatsapp_status', dest: 'match', medium: 'social', seed: true,
    source: 'whatsapp_status',
    label: 'SEED — founder WhatsApp status',
    carrier: '(digital — see utm-index)',
  },
  // ---- Generic homepage QR per channel (dest:'home', one row, not per-match) ----
  {
    id: 'home_mosque', dest: 'home', medium: 'qr', seed: false,
    source: 'mosque_alfarooq',
    label: 'Homepage QR — mosque board (whole guide, not one match)',
    carrier: 'mosque-flyer.html',
  },
  {
    id: 'home_restaurant', dest: 'home', medium: 'qr', seed: false,
    source: 'restaurant_aldente',
    label: 'Homepage QR — restaurant table-tent (whole guide)',
    carrier: 'table-tent.html',
  },
  {
    id: 'home_window', dest: 'home', medium: 'qr', seed: false,
    source: 'window_sticker',
    label: 'Homepage QR — window sticker (whole guide)',
    carrier: 'window-sticker.html',
  },
];

// --- URL builder -------------------------------------------------------------
// One function builds every destination URL so the UTM scheme is defined in
// exactly one place. URLSearchParams handles encoding; we set keys in a stable
// order for readable, diff-friendly URLs.
function buildUrl(channel, match) {
  const path = channel.dest === 'home' ? '/' : `/match/${match.slug}`;
  const u = new URL(path, SITE);
  const source = channel.sourceFor ? channel.sourceFor(match) : channel.source;
  u.searchParams.set('utm_source', source);
  u.searchParams.set('utm_medium', channel.medium);
  u.searchParams.set('utm_campaign', CAMPAIGN);
  if (channel.seed) {
    // OUR seed posts carry content=seed; re-shares won't. This is the split.
    u.searchParams.set('utm_content', 'seed');
  }
  return { url: u.toString(), source };
}

// Stable per-instance id used for filenames and the index key.
function instanceId(channel, match) {
  return channel.dest === 'home'
    ? channel.id // e.g. home_mosque  (one file, not per match)
    : `${channel.id}-${match.slug}`; // e.g. mosque-spain-saudi-arabia
}

// --- Build the full matrix ---------------------------------------------------
function buildMatrix() {
  const rows = [];
  for (const channel of CHANNELS) {
    const matches = channel.dest === 'home' ? [MATCHES[0]] : MATCHES; // home: once
    for (const match of matches) {
      const { url, source } = buildUrl(channel, match);
      const id = instanceId(channel, match);
      rows.push({
        id,
        channel,
        match: channel.dest === 'home' ? null : match,
        dest: channel.dest,
        source,
        url,
        svgFile: `qr/${id}.svg`,
        pngFile: `qr/${id}.png`,
      });
    }
  }
  return rows;
}

// --- QR generation + decode round-trip --------------------------------------
// Encode each URL to BOTH svg (crisp print) and png (universal), then decode
// the png back with jsQR and assert it equals the source URL. The SVG is
// trusted transitively: qrcode renders both from the same matrix, and the png
// is the one we can mechanically read back.
async function generateQrs(rows, verify) {
  await mkdir(QR_DIR, { recursive: true });
  const results = [];
  for (const r of rows) {
    const svg = await QRCode.toString(r.url, {
      type: 'svg', margin: 2, errorCorrectionLevel: QR_ECC,
      color: { dark: QR_DARK, light: QR_LIGHT },
    });
    const pngBuf = await QRCode.toBuffer(r.url, {
      type: 'png', margin: 2, width: 600, errorCorrectionLevel: QR_ECC,
      color: { dark: QR_DARK, light: QR_LIGHT },
    });
    await writeFile(join(PRINT_DIR, r.svgFile), svg, 'utf8');
    await writeFile(join(PRINT_DIR, r.pngFile), pngBuf);

    let ok = true;
    let decoded = null;
    if (verify) {
      const png = PNG.sync.read(pngBuf);
      const out = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
      decoded = out ? out.data : null;
      ok = decoded === r.url;
    }
    results.push({ ...r, svg, verified: verify, decodeOk: ok, decoded });
  }
  return results;
}

// --- shared HTML head / palette ---------------------------------------------
const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// One <style> block shared by every printable so the DESIGN.md palette is
// defined once. Each asset adds its own component styles on top.
const PALETTE_CSS = `
    :root {
      --brand: #0f766e;        /* teal-700  */
      --brand-dark: #065f46;   /* emerald-800 */
      --brand-soft: #ccfbf1;   /* teal-100  */
      --accent: #ca8a04;       /* amber-600 */
      --bg: #fafaf9;           /* stone-50  */
      --surface: #ffffff;
      --ink: #1c1917;          /* stone-900 */
      --ink-soft: #57534e;     /* stone-600 */
      --border: #e7e5e4;       /* stone-200 */
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; }
    body {
      background: var(--bg);
      color: var(--ink);
      font-family: ui-sans-serif, system-ui, "Segoe UI", "Noto Sans Arabic", sans-serif;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }`;

// Inline-SVG QR (no network needed at print time). The generated SVG already
// carries the brand colors; we strip its XML prolog so it embeds cleanly.
function inlineQr(svg) {
  return svg.replace(/<\?xml[^>]*\?>\s*/i, '').trim();
}

// The honest framing, kept identical across every asset. Tri-lingual: AR / EN /
// FR (francophone fans), so the value prop reads regardless of language.
function benefitBlock() {
  return `
        <p class="benefit-ar" dir="rtl" lang="ar">حلال وصلاة بجوار ملعب أتلانتا — خطتك ليوم المباراة.</p>
        <p class="benefit-en">Halal food &amp; prayer near Atlanta Stadium — your match-day plan.</p>
        <p class="benefit-fr" lang="fr">Halal et prière près du stade d'Atlanta — votre plan match.</p>`;
}

const HONEST_NOTE = `Walkable halal food &amp; prayer spots near <strong>Mercedes-Benz Stadium</strong>.
          There is no prayer room inside the stadium — we show you the nearest one.`;

// ============================================================================
// ASSET 1 — Restaurant table-tent (fold-in-half tent, two matches per A4)
// ============================================================================
function buildTableTent(byMatch) {
  const cards = MATCHES.map((m) => {
    const r = byMatch.get(`restaurant-${m.slug}`);
    return `      <article class="tent">
        <div class="tent__panel">
          <header class="tent__brand">🟢 Atlan Metro Green Book</header>
          ${benefitBlock()}
          <h2 class="tent__match">${esc(m.en)}</h2>
          <p class="tent__match-ar" dir="rtl" lang="ar">${esc(m.ar)}</p>
          <p class="tent__date">📅 ${esc(m.date)}</p>
          <div class="qr">${inlineQr(r.svg)}</div>
          <p class="scan">Scan for your match-day guide · امسح · Scannez</p>
          <p class="honest">${HONEST_NOTE}</p>
          <footer class="tent__foot">
            <span>Al Dente Halal · table-tent</span>
            <span class="url">${esc(SITE)}/match/${esc(m.slug)}</span>
          </footer>
        </div>
      </article>`;
  }).join('\n');

  return htmlDoc('Restaurant Table-Tents', `
    .lead { max-width: 1000px; margin: 0 auto; padding: 20px 16px 0; }
    .lead h1 { font-size: 24px; color: var(--brand-dark); margin: 0 0 4px; }
    .lead p { font-size: 13px; color: var(--ink-soft); margin: 0 0 16px; }
    .grid { max-width: 1000px; margin: 0 auto; padding: 0 16px 60px;
      display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
    .tent { page-break-inside: avoid; break-inside: avoid; }
    .tent__panel {
      background: var(--surface); border: 1px solid var(--border);
      border-top: 5px solid var(--accent); border-radius: 14px; padding: 22px;
      text-align: center; display: flex; flex-direction: column; gap: 6px;
      min-height: 360px;
    }
    .tent__brand { font-weight: 700; color: var(--brand-dark); font-size: 15px; }
    .benefit-ar { font-size: 18px; font-weight: 700; margin: 8px 0 0; }
    .benefit-en { font-size: 14px; color: var(--ink-soft); margin: 0; }
    .benefit-fr { font-size: 13px; color: var(--ink-soft); margin: 0; font-style: italic; }
    .tent__match { font-size: 20px; color: var(--brand-dark); margin: 10px 0 0; }
    .tent__match-ar { font-size: 15px; color: var(--ink-soft); margin: 0; }
    .tent__date { font-size: 13px; font-weight: 700; color: var(--accent); margin: 6px 0 0; }
    .qr { width: 180px; height: 180px; margin: 10px auto 0; }
    .qr svg { width: 100%; height: 100%; display: block; }
    .scan { font-size: 12px; font-weight: 600; color: var(--ink-soft); margin: 6px 0 0; }
    .honest { font-size: 12px; color: var(--ink-soft); background: var(--brand-soft);
      padding: 8px 10px; border-radius: 10px; margin: 8px 0 0; }
    .honest strong { color: var(--brand-dark); }
    .tent__foot { margin-top: auto; padding-top: 10px; border-top: 1px solid var(--border);
      display: flex; flex-direction: column; gap: 2px; font-size: 11px; color: var(--ink-soft); }
    .url { font-family: ui-monospace, Menlo, monospace; font-size: 10px; color: var(--brand); word-break: break-all; }
    @media print { @page { size: A4 portrait; margin: 10mm; } .lead { display: none; }
      .grid { padding: 0; gap: 6mm; } .tent__panel { border: 1px solid #999; } }
    @media (max-width: 680px) { .grid { grid-template-columns: 1fr; } }
  `, `
    <section class="lead">
      <h1>Restaurant table-tents</h1>
      <p>Print A4, cut the cards, fold in half to stand on a table. Each QR is uniquely
         tagged (utm_source=restaurant_aldente, utm_medium=qr) so scans-per-venue are countable.</p>
    </section>
    <section class="grid">
${cards}
    </section>`);
}

// ============================================================================
// ASSET 2 — Mosque announcement-board flyer (one big portrait card per match)
// ============================================================================
function buildMosqueFlyer(byMatch) {
  const homeR = byMatch.get('home_mosque');
  const cards = MATCHES.map((m) => {
    const r = byMatch.get(`mosque-${m.slug}`);
    return `      <article class="flyer">
        <header class="flyer__head">
          <span class="flyer__brand">🟢 Atlan Metro Green Book</span>
          <span class="flyer__chip">Match-day guide</span>
        </header>
        ${benefitBlock()}
        <h2 class="flyer__match">${esc(m.en)}</h2>
        <p class="flyer__match-ar" dir="rtl" lang="ar">${esc(m.ar)}</p>
        <p class="flyer__match-fr" lang="fr">${esc(m.fr)}</p>
        <p class="flyer__date">📅 Kickoff: ${esc(m.date)}</p>
        <div class="qr">${inlineQr(r.svg)}</div>
        <p class="scan">Scan with your phone camera · امسح بكاميرا هاتفك · Scannez</p>
        <p class="honest">${HONEST_NOTE}</p>
        <footer class="flyer__foot">Posted for the community · Al-Farooq Masjid board ·
          <span class="url">${esc(SITE)}/match/${esc(m.slug)}</span></footer>
      </article>`;
  }).join('\n');

  return htmlDoc('Mosque Announcement Flyer', `
    .lead { max-width: 980px; margin: 0 auto; padding: 20px 16px 0; }
    .lead h1 { font-size: 24px; color: var(--brand-dark); margin: 0 0 4px; }
    .lead p { font-size: 13px; color: var(--ink-soft); margin: 0 0 8px; }
    .lead .home { font-size: 13px; color: var(--ink-soft); display: flex; gap: 12px; align-items: center;
      background: var(--brand-soft); border-radius: 10px; padding: 8px 12px; margin: 0 0 16px; }
    .lead .home .miniqr { width: 64px; height: 64px; flex: none; }
    .lead .home .miniqr svg { width: 100%; height: 100%; }
    .grid { max-width: 980px; margin: 0 auto; padding: 0 16px 60px;
      display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
    .flyer { background: var(--surface); border: 1px solid var(--border);
      border-top: 6px solid var(--brand); border-radius: 16px; padding: 26px;
      text-align: center; page-break-inside: avoid; break-inside: avoid;
      display: flex; flex-direction: column; gap: 6px; }
    .flyer__head { display: flex; justify-content: space-between; align-items: center; }
    .flyer__brand { font-weight: 700; color: var(--brand-dark); font-size: 15px; }
    .flyer__chip { font-size: 11px; font-weight: 600; background: var(--brand-soft);
      color: var(--brand-dark); padding: 3px 9px; border-radius: 999px; }
    .benefit-ar { font-size: 20px; font-weight: 700; margin: 10px 0 0; }
    .benefit-en { font-size: 15px; color: var(--ink-soft); margin: 0; }
    .benefit-fr { font-size: 13px; color: var(--ink-soft); margin: 0; font-style: italic; }
    .flyer__match { font-size: 23px; color: var(--brand-dark); margin: 12px 0 0; }
    .flyer__match-ar { font-size: 16px; color: var(--ink-soft); margin: 0; }
    .flyer__match-fr { font-size: 13px; color: var(--ink-soft); margin: 0; }
    .flyer__date { font-size: 14px; font-weight: 700; color: var(--accent); margin: 8px 0 0;
      background: #fef3c7; display: inline-block; padding: 4px 12px; border-radius: 999px; align-self: center; }
    .qr { width: 220px; height: 220px; margin: 12px auto 0; }
    .qr svg { width: 100%; height: 100%; display: block; }
    .scan { font-size: 13px; font-weight: 600; color: var(--ink-soft); margin: 8px 0 0; }
    .honest { font-size: 13px; color: var(--ink-soft); background: var(--brand-soft);
      padding: 10px 12px; border-radius: 10px; margin: 8px 0 0; }
    .honest strong { color: var(--brand-dark); }
    .flyer__foot { margin-top: auto; padding-top: 12px; border-top: 1px solid var(--border);
      font-size: 11px; color: var(--ink-soft); }
    .url { font-family: ui-monospace, Menlo, monospace; font-size: 10px; color: var(--brand); word-break: break-all; }
    @media print { @page { size: A4 portrait; margin: 12mm; } .lead { display: none; }
      .grid { padding: 0; gap: 6mm; } .flyer { border: 1px solid #999; } }
    @media (max-width: 680px) { .grid { grid-template-columns: 1fr; } }
  `, `
    <section class="lead">
      <h1>Mosque announcement-board flyer</h1>
      <p>Print A4 and pin to the board. One card per match — each QR opens that match's
         walkable halal &amp; prayer guide. utm_source=mosque_alfarooq, utm_medium=qr.</p>
      <div class="home">
        <div class="miniqr">${inlineQr(homeR.svg)}</div>
        <span>Prefer the whole guide rather than one match? This homepage QR opens the full
          Atlanta directory — same mosque attribution.</span>
      </div>
    </section>
    <section class="grid">
${cards}
    </section>`);
}

// ============================================================================
// ASSET 3 — Storefront window sticker (square, bold, one per match)
// ============================================================================
function buildWindowSticker(byMatch) {
  const cards = MATCHES.map((m) => {
    const r = byMatch.get(`window-${m.slug}`);
    return `      <article class="sticker">
        <div class="sticker__top">🟢 Halal &amp; Prayer · Match Day</div>
        <h2 class="sticker__match">${esc(m.en)}</h2>
        <p class="sticker__match-ar" dir="rtl" lang="ar">${esc(m.ar)}</p>
        <p class="sticker__date">📅 ${esc(m.date)}</p>
        <div class="qr">${inlineQr(r.svg)}</div>
        <p class="scan">Scan · امسح · Scannez</p>
        <p class="sticker__honest">Walkable halal food &amp; prayer near the stadium.</p>
        <div class="sticker__url">${esc(SITE)}/match/${esc(m.slug)}</div>
      </article>`;
  }).join('\n');

  return htmlDoc('Window Stickers', `
    .lead { max-width: 900px; margin: 0 auto; padding: 20px 16px 0; }
    .lead h1 { font-size: 24px; color: var(--brand-dark); margin: 0 0 4px; }
    .lead p { font-size: 13px; color: var(--ink-soft); margin: 0 0 16px; }
    .grid { max-width: 900px; margin: 0 auto; padding: 0 16px 60px;
      display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
    .sticker {
      background: var(--surface); border: 3px solid var(--brand-dark);
      border-radius: 18px; padding: 22px; text-align: center;
      aspect-ratio: 1 / 1; display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 6px; page-break-inside: avoid; break-inside: avoid;
    }
    .sticker__top { font-size: 14px; font-weight: 700; color: #fff; background: var(--brand);
      padding: 6px 14px; border-radius: 999px; }
    .sticker__match { font-size: 21px; color: var(--brand-dark); margin: 8px 0 0; }
    .sticker__match-ar { font-size: 15px; color: var(--ink-soft); margin: 0; }
    .sticker__date { font-size: 13px; font-weight: 700; color: var(--accent); margin: 6px 0 0; }
    .qr { width: 200px; height: 200px; margin: 8px auto 0; }
    .qr svg { width: 100%; height: 100%; display: block; }
    .scan { font-size: 14px; font-weight: 700; color: var(--brand-dark); margin: 6px 0 0; }
    .sticker__honest { font-size: 12px; color: var(--ink-soft); margin: 4px 0 0; }
    .sticker__url { font-family: ui-monospace, Menlo, monospace; font-size: 10px; color: var(--brand); word-break: break-all; }
    @media print { @page { size: A4 portrait; margin: 12mm; } .lead { display: none; }
      .grid { padding: 0; gap: 8mm; } .sticker { border: 2px solid #333; } }
    @media (max-width: 680px) { .grid { grid-template-columns: 1fr; } }
  `, `
    <section class="lead">
      <h1>Storefront window stickers</h1>
      <p>Square format for a shop window or door. Print, cut, tape facing out. Bold so a
         passerby reads it in a glance. utm_source=window_sticker, utm_medium=qr.</p>
    </section>
    <section class="grid">
${cards}
    </section>`);
}

// ============================================================================
// ASSET 4 — Combined contact sheet (EVERY QR, one card each) — kept & rebuilt.
// This is the founder's "what is this QR?" reference; mirrors the index.
// ============================================================================
function buildContactSheet(results) {
  const cards = results.map((r) => {
    const seed = r.channel.seed;
    const title = r.dest === 'home' ? 'Homepage (whole guide)' : r.match.en;
    const titleAr = r.dest === 'home' ? 'الدليل كامل' : r.match.ar;
    // Per-match cards show the kickoff caption; homepage cards have no single
    // match, so they show the occasion label instead.
    const occasion = r.dest === 'home' ? HOME_OCCASION : `📅 ${r.match.date}`;
    return `      <article class="card ${seed ? 'card--seed' : ''}">
        <header class="card__head">
          <span class="card__id">${esc(r.id)}</span>
          <span class="card__tag ${seed ? 'tag--seed' : 'tag--place'}">${seed ? 'SEED · social' : 'QR · placement'}</span>
        </header>
        <div class="qr">${inlineQr(r.svg)}</div>
        <h2 class="card__title">${esc(title)}</h2>
        <p class="card__title-ar" dir="rtl" lang="ar">${esc(titleAr)}</p>
        <p class="card__date">${esc(occasion)}</p>
        <p class="card__label">${esc(r.channel.label)}</p>
        <p class="card__src">utm_source=<strong>${esc(r.source)}</strong> · medium=${esc(r.channel.medium)}${seed ? ' · content=seed' : ''}</p>
        <p class="card__url">${esc(r.url)}</p>
      </article>`;
  }).join('\n');

  return htmlDoc('Every QR — contact sheet', `
    .intro { max-width: 1100px; margin: 0 auto; padding: 24px 16px 0; }
    .intro .box { background: linear-gradient(135deg, var(--brand), var(--brand-dark));
      color: #fff; border-radius: 16px; padding: 22px; }
    .intro h1 { margin: 0 0 6px; font-size: 26px; }
    .intro p { margin: 4px 0; opacity: .95; font-size: 14px; }
    .intro .note { font-size: 12px; opacity: .85; margin-top: 10px; }
    .legend { display: flex; gap: 10px; flex-wrap: wrap; margin: 12px 0 0; }
    .legend span { font-size: 12px; padding: 4px 10px; border-radius: 999px; }
    .legend .l-place { background: var(--brand-soft); color: var(--brand-dark); }
    .legend .l-seed { background: #fef3c7; color: #854d0e; }
    .grid { max-width: 1100px; margin: 0 auto; padding: 18px 16px 60px;
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .card { background: var(--surface); border: 1px solid var(--border);
      border-top: 4px solid var(--brand); border-radius: 14px; padding: 16px;
      text-align: center; page-break-inside: avoid; break-inside: avoid; }
    .card--seed { border-top-color: var(--accent); }
    .card__head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .card__id { font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: var(--ink-soft); }
    .card__tag { font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 999px; }
    .tag--place { background: var(--brand-soft); color: var(--brand-dark); }
    .tag--seed { background: #fef3c7; color: #854d0e; }
    .qr { width: 150px; height: 150px; margin: 10px auto; }
    .qr svg { width: 100%; height: 100%; display: block; }
    .card__title { font-size: 16px; color: var(--brand-dark); margin: 6px 0 0; }
    .card__title-ar { font-size: 13px; color: var(--ink-soft); margin: 0; }
    .card__date { font-size: 12px; font-weight: 700; color: var(--accent); margin: 4px 0 0; }
    .card__label { font-size: 12px; color: var(--ink); margin: 6px 0 0; }
    .card__src { font-size: 11px; color: var(--ink-soft); margin: 4px 0 0; }
    .card__url { font-family: ui-monospace, Menlo, monospace; font-size: 9px; color: var(--brand);
      word-break: break-all; margin: 6px 0 0; }
    @media print { @page { size: A4 portrait; margin: 10mm; } .intro { display: none; }
      .grid { padding: 0; gap: 4mm; grid-template-columns: repeat(3, 1fr); }
      .card { border: 1px solid #999; } }
    @media (max-width: 820px) { .grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 560px) { .grid { grid-template-columns: 1fr; } }
  `, `
    <section class="intro">
      <div class="box">
        <h1>🟢 Every QR — contact sheet</h1>
        <p>One card per generated QR. The id under each code matches qr/&lt;id&gt;.svg/.png and the
          row in utm-index.csv — so you always know which printed code is which.</p>
        <p class="note"><strong>QR · placement</strong> = a printed code a stranger scans (medium=qr, cold reach).
          <strong>SEED · social</strong> = a link the founder posts himself (medium=social, content=seed) —
          tagged so organic re-shares are countable.</p>
        <div class="legend">
          <span class="l-place">QR · placement = physical scan</span>
          <span class="l-seed">SEED · social = founder's own post</span>
        </div>
      </div>
    </section>
    <section class="grid">
${cards}
    </section>`);
}

// --- HTML document shell -----------------------------------------------------
function htmlDoc(title, css, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)} — Atlan Metro Green Book</title>
  <meta name="robots" content="noindex" />
  <style>${PALETTE_CSS}
${css}</style>
</head>
<body>
${body}
</body>
</html>
`;
}

// --- Machine-readable index (CSV + JSON) ------------------------------------
function buildIndex(results) {
  const records = results.map((r) => ({
    id: r.id,
    channel: r.channel.id,
    family: r.channel.seed ? 'seed' : 'placement',
    dest: r.dest,
    match: r.match ? r.match.slug : '',
    utm_source: r.source,
    utm_medium: r.channel.medium,
    utm_campaign: CAMPAIGN,
    utm_content: r.channel.seed ? 'seed' : '',
    url: r.url,
    qr_svg: r.svgFile,
    qr_png: r.pngFile,
    asset_file: r.channel.carrier,
    decode_ok: r.verified ? String(r.decodeOk) : 'skipped',
  }));

  const cols = ['id', 'channel', 'family', 'dest', 'match', 'utm_source',
    'utm_medium', 'utm_campaign', 'utm_content', 'url', 'qr_svg', 'qr_png',
    'asset_file', 'decode_ok'];
  const csvCell = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [cols.join(',')]
    .concat(records.map((rec) => cols.map((c) => csvCell(rec[c])).join(',')))
    .join('\n') + '\n';

  const json = JSON.stringify({
    generated: new Date().toISOString(),
    site: SITE,
    campaign: CAMPAIGN,
    count: records.length,
    utm_scheme: {
      utm_medium: { qr: 'printed code (cold reach)', social: "founder's own post (seed)" },
      utm_content: { seed: 'OUR seed post — re-shares are untagged, so subtractable' },
      utm_campaign: CAMPAIGN,
    },
    assets: records,
  }, null, 2) + '\n';

  return { csv, json };
}

// --- stdout report -----------------------------------------------------------
function printReport(results) {
  console.log('\n🟢 Atlan Metro Green Book — World Cup marketing assets');
  console.log(`   Base: ${SITE}   Campaign: ${CAMPAIGN}`);
  console.log(`   ${results.length} tagged QR instances generated (SVG + PNG each).\n`);
  console.log('   medium=qr     → printed code a stranger scans (cold reach)');
  console.log('   medium=social + content=seed → founder\'s OWN post (self-seeding).');
  console.log('   Re-shares drop content=seed, so organic spread is countable.\n');

  let lastChannel = null;
  for (const r of results) {
    if (r.channel.id !== lastChannel) {
      console.log(`\n── ${r.channel.label} ──`);
      lastChannel = r.channel.id;
    }
    const flag = r.verified ? (r.decodeOk ? '✓' : '✗ MISMATCH') : '·';
    console.log(`  ${flag} ${r.id}`);
    console.log(`      ${r.url}`);
  }
  console.log('');
}

// --- main --------------------------------------------------------------------
async function main() {
  const verify = !process.argv.includes('--no-verify');
  const rows = buildMatrix();

  await mkdir(PRINT_DIR, { recursive: true });
  const results = await generateQrs(rows, verify);

  printReport(results);

  // Round-trip gate: a wrong QR in print is worse than no QR.
  const mismatches = results.filter((r) => r.verified && !r.decodeOk);
  if (mismatches.length > 0) {
    console.error(`\n✗ QR decode round-trip FAILED for ${mismatches.length} code(s):`);
    for (const m of mismatches) {
      console.error(`   ${m.id}: encoded ${m.url}\n            decoded ${m.decoded ?? '(no QR found)'}`);
    }
    process.exit(1);
  }
  if (verify) {
    console.log(`✓ QR decode round-trip: all ${results.length} codes encode their intended URL.`);
  } else {
    console.log('· QR decode round-trip skipped (--no-verify).');
  }

  // Index for filename lookups inside the asset builders.
  const byMatch = new Map(results.map((r) => [r.id, r]));

  const writes = [
    ['table-tent.html', buildTableTent(byMatch)],
    ['mosque-flyer.html', buildMosqueFlyer(byMatch)],
    ['window-sticker.html', buildWindowSticker(byMatch)],
    ['match-day-flyer.html', buildContactSheet(results)],
  ];
  for (const [name, html] of writes) {
    await writeFile(join(PRINT_DIR, name), html, 'utf8');
    console.log(`✓ Wrote web/public/print/${name}`);
  }

  const { csv, json } = buildIndex(results);
  await writeFile(join(PRINT_DIR, 'utm-index.csv'), csv, 'utf8');
  await writeFile(join(PRINT_DIR, 'utm-index.json'), json, 'utf8');
  console.log('✓ Wrote web/public/print/utm-index.csv');
  console.log('✓ Wrote web/public/print/utm-index.json');
  console.log(`\n✓ Done — ${results.length} QR codes, 4 HTML assets, 1 index (csv+json).\n`);
}

main().catch((err) => {
  console.error('\n✗ Marketing-asset generation failed:', err.message);
  process.exit(1);
});
