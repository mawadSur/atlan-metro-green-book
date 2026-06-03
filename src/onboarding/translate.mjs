// Translation layer for onboarded records.
//
// Strategy (in priority order), per field:
//   1. Keep any value already present (OSM name:ar / name:es tags, etc.)
//   2. If a LibreTranslate endpoint is configured, machine-translate.
//   3. Otherwise leave blank — the app falls back to English, and human
//      editors / the business portal can fill it in later.
//
// LibreTranslate is OPTIONAL and OFF by default, so onboarding never blocks
// on a network translation service. Enable by setting:
//   LIBRETRANSLATE_URL=https://libretranslate.com/translate
//   LIBRETRANSLATE_KEY=<key>   (some hosts require it)

import { USER_AGENT } from './geocode.mjs';

const LT_URL = process.env.LIBRETRANSLATE_URL || '';
const LT_KEY = process.env.LIBRETRANSLATE_KEY || '';

const cache = new Map(); // `${target}:${text}` -> translated

async function libreTranslate(text, target) {
  if (!LT_URL || !text) return '';
  const key = `${target}:${text}`;
  if (cache.has(key)) return cache.get(key);
  try {
    const res = await fetch(LT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
      body: JSON.stringify({
        q: text,
        source: 'en',
        target, // 'ar' | 'es'
        format: 'text',
        ...(LT_KEY ? { api_key: LT_KEY } : {}),
      }),
    });
    if (!res.ok) return '';
    const data = await res.json();
    const out = data.translatedText || '';
    cache.set(key, out);
    return out;
  } catch {
    return ''; // never throw — translation is best-effort
  }
}

/** Fill name_ar/name_es and hours_ar/hours_es for one record, in place. */
export async function translateRecord(rec) {
  if (!rec.name_ar) rec.name_ar = await libreTranslate(rec.name_en, 'ar');
  if (!rec.name_es) rec.name_es = await libreTranslate(rec.name_en, 'es');
  if (!rec.hours_ar) rec.hours_ar = await libreTranslate(rec.hours_en, 'ar');
  if (!rec.hours_es) rec.hours_es = await libreTranslate(rec.hours_en, 'es');
  return rec;
}

/**
 * Translate a batch. With no LibreTranslate configured this is a near-instant
 * no-op that simply leaves missing fields blank.
 */
export async function translateAll(records, { onProgress } = {}) {
  let done = 0;
  for (const rec of records) {
    await translateRecord(rec);
    onProgress?.(++done, records.length);
  }
  return records;
}

export const translationEnabled = Boolean(LT_URL);
