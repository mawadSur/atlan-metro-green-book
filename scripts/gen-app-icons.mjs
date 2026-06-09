#!/usr/bin/env node
// gen-app-icons.mjs — regenerate the native app icons from the brand mark.
//
// The mobile app shipped with Expo's template placeholder icons (blue chevron
// + construction guides). The real brand mark — a gold mosque dome + moon on a
// teal gradient — already lives on the web PWA (web/public/icons). This script
// recreates that mark as a crisp SVG and renders every native variant so the
// web, iOS, and Android icons match.
//
// Outputs (overwrites assets/, names referenced by app.json):
//   icon.png                    1024  iOS + general. Opaque, NO alpha (App Store
//                                     rejects alpha); OS applies its own mask.
//   android-icon-background.png 1024  Adaptive bg: full-bleed teal gradient.
//   android-icon-foreground.png 1024  Adaptive fg: mark inside the center safe
//                                     zone (~66dp of 108dp) so the launcher mask
//                                     never clips it. Transparent.
//   android-icon-monochrome.png 1024  Android 13+ themed icon: single-tone
//                                     silhouette in the same safe zone.
//   splash-icon.png             1024  Splash mark on transparent (shown on the
//                                     #0f766e backgroundColor set in app.json).
//   favicon.png                 48    Expo web favicon.
//
// Usage: node scripts/gen-app-icons.mjs
// Requires `sharp` (already installed under web/node_modules).

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ASSETS = join(ROOT, 'assets');

// sharp lives in the web workspace, not the native root.
const require = createRequire(join(ROOT, 'web', 'package.json'));
const sharp = require('sharp');

// ---- brand tokens (mirror src/theme/colors.ts + web manifest) ----
const TEAL = '#0f766e';
const TEAL_DEEP = '#064e3b';
const TEAL_HI = '#15897d';
const GOLD = '#ca8a04';
const GOLD_HI = '#e0a012';
const CREAM = '#fafaf9';

const VB = 1000; // SVG coordinate space

// The mosque-dome + moon mark, centered in a 1000x1000 box. `mono` collapses
// every part to one tone (for the Android themed-icon layer). Returns the inner
// SVG markup (no <svg> root) so it can be embedded at different scales.
//
// Geometry: a squat dome (wide semicircular arch on a short drum) so it reads as
// a mosque dome, not a bell; moon in the upper-left negative space, clear of the
// arch. The translate re-centers the combined bounding box on (500,500).
function markGroup({ mono = null } = {}) {
  const dome = mono ?? 'url(#gold)';
  const moon = mono ?? CREAM;
  const finial = mono ?? 'url(#gold)';
  // arch: semicircle r=220 centered (510,516); drum: short straight sides to 660.
  return `
  <g transform="translate(34,62)">
    <!-- moon, upper-left, clear of the dome -->
    <circle cx="275" cy="285" r="98" fill="${moon}" />
    <!-- finial: spike + ball above the dome apex -->
    <rect x="503" y="176" width="14" height="78" rx="7" fill="${finial}" />
    <circle cx="510" cy="256" r="26" fill="${finial}" />
    <!-- dome: wide arch on a short drum -->
    <path d="M290 660 L290 516 A220 220 0 0 1 730 516 L730 660 Z" fill="${dome}" />
    <!-- base lip -->
    <rect x="265" y="636" width="490" height="68" rx="18" fill="${dome}" />
  </g>`;
}

function gradientDefs() {
  return `
  <defs>
    <linearGradient id="teal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${TEAL_HI}" />
      <stop offset="0.55" stop-color="${TEAL}" />
      <stop offset="1" stop-color="${TEAL_DEEP}" />
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${GOLD_HI}" />
      <stop offset="1" stop-color="${GOLD}" />
    </linearGradient>
  </defs>`;
}

const svg = (inner) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${VB}" height="${VB}" viewBox="0 0 ${VB} ${VB}">${inner}</svg>`
  );

// Full-bleed teal gradient (iOS bg + Android adaptive background).
const bgSvg = svg(`${gradientDefs()}<rect width="${VB}" height="${VB}" fill="url(#teal)" />`);
// Mark on transparent (composited at different scales per output).
const markSvg = svg(`${gradientDefs()}${markGroup()}`);
const monoSvg = svg(markGroup({ mono: '#ffffff' }));

const SIZE = 1024;

// Render an SVG buffer to a PNG buffer at `px`, then resize. Density high so the
// vector stays crisp.
const renderPng = (buf, px) =>
  sharp(buf, { density: 384 }).resize(px, px, { fit: 'contain', background: '#00000000' }).png().toBuffer();

// Composite a mark (scaled to `markFrac` of the canvas, centered) onto a base.
async function composite(baseBuf, markBuf, markFrac, { flatten = false } = {}) {
  const markPx = Math.round(SIZE * markFrac);
  const mark = await renderPng(markBuf, markPx);
  let img = sharp(baseBuf).resize(SIZE, SIZE).composite([{ input: mark, gravity: 'center' }]);
  if (flatten) {
    // App Store rejects an alpha channel on the marketing icon. flatten()
    // composites onto an opaque bg; removeAlpha() then drops the channel so the
    // PNG is encoded as RGB (color type 2), not RGBA.
    img = img.flatten({ background: TEAL }).removeAlpha();
  }
  return img.png().toBuffer();
}

async function transparentMark(markBuf, markFrac) {
  const markPx = Math.round(SIZE * markFrac);
  const mark = await renderPng(markBuf, markPx);
  return sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: '#00000000' },
  })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toBuffer();
}

async function main() {
  const out = (name, buf) => sharp(buf).toFile(join(ASSETS, name)).then(() => console.log('✓', name));

  // iOS / general: opaque, mark fills ~80% with margin, no alpha.
  const icon = await composite(bgSvg, markSvg, 0.8, { flatten: true });
  await out('icon.png', icon);

  // Android adaptive background: full-bleed gradient.
  await out('android-icon-background.png', await sharp(bgSvg, { density: 384 }).resize(SIZE, SIZE).png().toBuffer());

  // Android adaptive foreground: mark in the safe zone (~64% < 66/108 guarantee).
  await out('android-icon-foreground.png', await transparentMark(markSvg, 0.62));

  // Android 13+ monochrome themed layer: same safe zone, single tone.
  await out('android-icon-monochrome.png', await transparentMark(monoSvg, 0.62));

  // Splash mark on transparent (shown over app.json backgroundColor #0f766e).
  await out('splash-icon.png', await transparentMark(markSvg, 0.5));

  // Web favicon.
  await sharp(icon).resize(48, 48).png().toFile(join(ASSETS, 'favicon.png'));
  console.log('✓ favicon.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
