#!/usr/bin/env node
// Marketing-asset generator — per-channel UTM links + QR images + a printable
// table-tent / flyer sheet for the 4 Atlanta World Cup match pages.
//
// Standalone deliverable. NO new npm deps, NO runtime dep on the web app, and
// it does NOT touch the Next.js build (output lives in web/public/print/,
// served as static files — not a route).
//
// Usage:
//   node scripts/gen-marketing-assets.mjs            # print table + write HTML
//   node scripts/gen-marketing-assets.mjs --fetch-qr # also save QR PNGs (needs net)
//
// Why two QR families exist (this distinction is the WHOLE point):
//   - PLACEMENT channels (mosque / restaurant / guerrilla): a physical QR a
//     stranger scans. utm_medium=qr. These measure cold reach.
//   - SEED channels (founder's own WhatsApp / Telegram / Reddit posts):
//     utm_medium=social, utm_source=seed_*. These are self-seeding. Tagging
//     them separately lets us subtract self-promotion from "organic" traffic —
//     so a re-share by someone else is distinguishable from the founder
//     posting in his own group. Without this split, virality is unmeasurable.
//
// Output:
//   - readable table to stdout
//   - web/public/print/match-day-flyer.html (always)
//   - web/public/print/qr/*.png            (only with --fetch-qr, best-effort)

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PRINT_DIR = join(ROOT, 'web', 'public', 'print');
const QR_DIR = join(PRINT_DIR, 'qr');

const SITE = 'https://atlan-green-book.vercel.app';
const CAMPAIGN = 'wc2026_atl'; // one campaign across every link, so totals roll up

// --- The 4 matches -----------------------------------------------------------
// slug = canonical /match/<slug> path; labels drive the printed flyer copy.
const MATCHES = [
  { slug: 'spain-saudi-arabia',   en: 'Spain vs Saudi Arabia', ar: 'إسبانيا ضد السعودية' },
  { slug: 'morocco-haiti',        en: 'Morocco vs Haiti',      ar: 'المغرب ضد هايتي' },
  { slug: 'dr-congo-uzbekistan',  en: 'DR Congo vs Uzbekistan',ar: 'الكونغو الديمقراطية ضد أوزبكستان' },
  { slug: 'semifinal-atlanta',    en: 'Semifinal — Atlanta',   ar: 'نصف النهائي — أتلانتا' },
];

// --- Channels ----------------------------------------------------------------
// PLACEMENT = physical QR a stranger scans (cold reach). medium=qr.
// SEED      = founder's own posts (self-seeding). medium=social, source=seed_*.
// `slot` is the {name}/{place} that gets slugified into utm_source so we can
// later tell WHICH mosque / WHICH fan-zone drove scans.
const CHANNELS = [
  { id: 'mosque',     family: 'placement', source: 'mosque_alfarooq',   medium: 'qr',     label: 'Mosque announcement board (Al-Farooq Masjid)' },
  { id: 'restaurant', family: 'placement', source: 'restaurant_aldente',medium: 'qr',     label: 'Restaurant table-tent' },
  { id: 'guerrilla',  family: 'placement', source: 'guerrilla_marta',   medium: 'qr',     label: 'Guerrilla — fan-zone / MARTA station' },
  { id: 'seed_wa',    family: 'seed',      source: 'seed_whatsapp',     medium: 'social', label: 'SEED — founder WhatsApp groups' },
  { id: 'seed_tg',    family: 'seed',      source: 'seed_telegram',     medium: 'social', label: 'SEED — founder Telegram channels' },
  { id: 'seed_rd',    family: 'seed',      source: 'seed_reddit',       medium: 'social', label: 'SEED — founder Reddit posts' },
];

// --- URL builders ------------------------------------------------------------
function buildUrl(slug, ch) {
  const u = new URL(`${SITE}/match/${slug}`);
  // URLSearchParams handles encoding; order is stable for readability.
  u.searchParams.set('utm_source', ch.source);
  u.searchParams.set('utm_medium', ch.medium);
  u.searchParams.set('utm_campaign', CAMPAIGN);
  u.searchParams.set('utm_content', slug); // per-match attribution within campaign
  return u.toString();
}

function qrUrl(finalUrl) {
  // Free, key-less QR endpoint. We only emit the URL; PNG fetch is opt-in.
  return `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=8&data=${encodeURIComponent(finalUrl)}`;
}

function qrFileName(slug, chId) {
  return `qr-${slug}-${chId}.png`;
}

// --- Build the full matrix ---------------------------------------------------
function buildMatrix() {
  const rows = [];
  for (const match of MATCHES) {
    for (const ch of CHANNELS) {
      const finalUrl = buildUrl(match.slug, ch);
      rows.push({
        match,
        channel: ch,
        finalUrl,
        qrImg: qrUrl(finalUrl),
        qrFile: qrFileName(match.slug, ch.id),
      });
    }
  }
  return rows;
}

// --- stdout table ------------------------------------------------------------
function printTable(rows) {
  console.log('\n🟢 Atlan Metro Green Book — World Cup marketing assets');
  console.log(`   Base: ${SITE}/match/<slug>   Campaign: ${CAMPAIGN}`);
  console.log(`   ${MATCHES.length} matches × ${CHANNELS.length} channels = ${rows.length} tagged links\n`);

  console.log('   PLACEMENT (medium=qr)   = physical QR a stranger scans → cold reach');
  console.log('   SEED      (medium=social)= founder\'s OWN posts → self-seeding, NOT organic.');
  console.log('   Splitting these is the point: organic re-shares are only countable');
  console.log('   once the founder\'s own seeding is tagged separately and subtracted.\n');

  let lastSlug = null;
  for (const r of rows) {
    if (r.match.slug !== lastSlug) {
      console.log(`\n── ${r.match.en}  (/match/${r.match.slug}) ──`);
      lastSlug = r.match.slug;
    }
    const fam = r.channel.family === 'seed' ? 'SEED ' : 'PLACE';
    console.log(`  [${fam}] ${r.channel.label}`);
    console.log(`         URL: ${r.finalUrl}`);
    console.log(`         QR : ${r.qrImg}`);
  }
  console.log('');
}

// --- HTML flyer / table-tent -------------------------------------------------
const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function flyerCard(r) {
  const seed = r.channel.family === 'seed';
  return `      <article class="tent ${seed ? 'tent--seed' : ''}">
        <header class="tent__head">
          <span class="tent__brand">🟢 Atlan Metro Green Book</span>
          <span class="tent__tag ${seed ? 'tag--seed' : 'tag--place'}">${seed ? 'SEED · social' : 'QR · placement'}</span>
        </header>

        <p class="tent__benefit-ar" dir="rtl" lang="ar">حلال وصلاة بجوار ملعب أتلانتا — خطتك ليوم المباراة.</p>
        <p class="tent__benefit-en">Halal &amp; prayer near Atlanta Stadium — your match-day plan.</p>

        <h2 class="tent__match">${esc(r.match.en)}</h2>
        <p class="tent__match-ar" dir="rtl" lang="ar">${esc(r.match.ar)}</p>

        <div class="tent__qr">
          <img src="${esc(r.qrImg)}" width="220" height="220"
               alt="QR code linking to ${esc(r.match.en)} match-day guide" loading="lazy" />
          <p class="tent__scan">Scan / امسح الرمز</p>
        </div>

        <p class="tent__honest">
          Walkable halal &amp; prayer spots near <strong>Mercedes-Benz Stadium</strong>.
          No prayer room inside the stadium — we show you the nearest one.
        </p>

        <footer class="tent__foot">
          <span>${esc(r.channel.label)}</span>
          <span class="tent__url">${esc(`${SITE}/match/${r.match.slug}`)}</span>
        </footer>
      </article>`;
}

function buildHtml(rows) {
  // Placement cards are the print-and-stick collateral. Seed cards are included
  // (clearly marked) so the founder has a single sheet with every QR.
  const cards = rows.map(flyerCard).join('\n');
  const generated = new Date().toISOString().slice(0, 10);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Match-Day Flyers — Atlan Metro Green Book</title>
  <meta name="robots" content="noindex" />
  <style>
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
    }
    .page {
      max-width: 1100px;
      margin: 0 auto;
      padding: 24px 16px 64px;
    }
    .intro {
      background: linear-gradient(135deg, var(--brand), var(--brand-dark));
      color: #fff;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .intro h1 { margin: 0 0 8px; font-size: 28px; font-weight: 700; }
    .intro p { margin: 4px 0; opacity: .95; }
    .intro .note { font-size: 13px; opacity: .85; margin-top: 12px; }
    .legend { display: flex; gap: 12px; flex-wrap: wrap; margin: 16px 0 0; }
    .legend span { font-size: 12px; padding: 4px 10px; border-radius: 999px; }
    .legend .l-place { background: var(--brand-soft); color: var(--brand-dark); }
    .legend .l-seed  { background: #fef3c7; color: #854d0e; }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }

    .tent {
      background: var(--surface);
      border: 1px solid var(--border);
      border-top: 4px solid var(--brand);
      border-radius: 14px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .tent--seed { border-top-color: var(--accent); }

    .tent__head { display: flex; align-items: center; justify-content: space-between; }
    .tent__brand { font-weight: 700; color: var(--brand-dark); font-size: 15px; }
    .tent__tag { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 999px; }
    .tag--place { background: var(--brand-soft); color: var(--brand-dark); }
    .tag--seed  { background: #fef3c7; color: #854d0e; }

    .tent__benefit-ar {
      font-size: 20px; font-weight: 700; color: var(--ink); margin: 8px 0 0;
      font-family: "Noto Sans Arabic", ui-sans-serif, sans-serif;
    }
    .tent__benefit-en { font-size: 15px; color: var(--ink-soft); margin: 0; }

    .tent__match { font-size: 22px; font-weight: 700; margin: 10px 0 0; color: var(--brand-dark); }
    .tent__match-ar { font-size: 16px; color: var(--ink-soft); margin: 0; font-family: "Noto Sans Arabic", ui-sans-serif, sans-serif; }

    .tent__qr {
      align-self: center;
      text-align: center;
      margin: 10px 0;
      padding: 12px;
      background: #fff;
      border: 1px solid var(--border);
      border-radius: 12px;
    }
    .tent__qr img { display: block; width: 220px; height: 220px; }
    .tent__scan { font-size: 13px; color: var(--ink-soft); margin: 8px 0 0; font-weight: 600; }

    .tent__honest {
      font-size: 13px; color: var(--ink-soft); margin: 4px 0 0;
      background: var(--brand-soft); padding: 10px 12px; border-radius: 10px;
    }
    .tent__honest strong { color: var(--brand-dark); }

    .tent__foot {
      display: flex; flex-direction: column; gap: 2px;
      margin-top: auto; padding-top: 12px;
      border-top: 1px solid var(--border);
      font-size: 12px; color: var(--ink-soft);
    }
    .tent__url { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 11px; color: var(--brand); word-break: break-all; }

    /* Print: Letter/A4, one channel per slot, hide screen-only chrome. */
    @media print {
      @page { size: A4 portrait; margin: 12mm; }
      body { background: #fff; }
      .page { padding: 0; max-width: none; }
      .intro, .legend { display: none; }
      .grid { gap: 0; grid-template-columns: repeat(2, 1fr); }
      .tent {
        border: 1px solid #999;
        border-radius: 8px;
        margin: 4mm;
        box-shadow: none;
      }
      .tent--seed { display: none; } /* seed cards are digital, not print collateral */
      .tent__url { color: #444; }
    }

    @media (max-width: 700px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <main class="page">
    <section class="intro">
      <h1>🟢 Match-Day Flyers &amp; Table-Tents</h1>
      <p dir="rtl" lang="ar" style="font-size:18px;font-weight:700;">حلال وصلاة بجوار ملعب أتلانتا — خطتك ليوم المباراة.</p>
      <p>Halal &amp; prayer near Atlanta Stadium — your match-day plan.</p>
      <p class="note">
        Print this sheet (A4/Letter). Cut along the cards. Fold a card to make a
        table-tent, or pin it to a board. Each QR is uniquely tagged so we can
        see which placement drove scans. <strong>SEED cards are hidden in print</strong>
        — they are the founder's own social posts, kept on-screen for copy/paste.
      </p>
      <div class="legend">
        <span class="l-place">QR · placement = physical scan (cold reach)</span>
        <span class="l-seed">SEED · social = founder's own posts (self-seeding)</span>
      </div>
      <p class="note">Generated ${generated} · base ${SITE}/match/&lt;slug&gt; · campaign ${CAMPAIGN}</p>
    </section>

    <section class="grid">
${cards}
    </section>
  </main>
</body>
</html>
`;
}

// --- Optional QR PNG fetch (best-effort, never fails the run) ----------------
async function fetchQrPngs(rows) {
  console.log('\n⬇  --fetch-qr: downloading QR PNGs (best-effort)…');
  await mkdir(QR_DIR, { recursive: true });
  let ok = 0;
  let fail = 0;
  for (const r of rows) {
    try {
      const res = await fetch(r.qrImg);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(join(QR_DIR, r.qrFile), buf);
      ok++;
    } catch (err) {
      fail++;
      console.warn(`   ⚠ ${r.qrFile}: ${err.message}`);
    }
  }
  console.log(`   QR PNGs: ${ok} saved, ${fail} failed → ${QR_DIR}`);
  if (fail > 0) {
    console.log('   (Network unavailable? The flyer still works — <img> loads the live QR URL.)');
  }
}

// --- main --------------------------------------------------------------------
async function main() {
  const fetchQr = process.argv.includes('--fetch-qr');
  const rows = buildMatrix();

  printTable(rows);

  await mkdir(PRINT_DIR, { recursive: true });
  const htmlPath = join(PRINT_DIR, 'match-day-flyer.html');
  await writeFile(htmlPath, buildHtml(rows), 'utf8');
  console.log(`✓ Wrote ${htmlPath}`);

  if (fetchQr) {
    await fetchQrPngs(rows);
  } else {
    console.log('  (run with --fetch-qr to also save QR PNGs to web/public/print/qr/)');
  }
  console.log('');
}

main().catch((err) => {
  console.error('\n✗ Marketing-asset generation failed:', err.message);
  process.exit(1);
});
