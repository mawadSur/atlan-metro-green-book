import { describe, it, expect } from 'vitest';
import { t, TYPE_LABELS } from '../web/src/i18n/strings.ts';
import { tp } from '../web/src/i18n/portal.ts';

const REQUIRED_LANGS = ['en', 'ar', 'es'];

describe('i18n completeness', () => {
  it('ensures all t keys have translations for en, ar, es', () => {
    const missing = [];

    for (const [key, dict] of Object.entries(t)) {
      for (const lang of REQUIRED_LANGS) {
        if (!dict[lang] || dict[lang].trim() === '') {
          missing.push(`t.${key}.${lang}`);
        }
      }
    }

    expect(missing).toEqual([]);
  });

  it('ensures all TYPE_LABELS have translations for en, ar, es', () => {
    const missing = [];

    for (const [type, dict] of Object.entries(TYPE_LABELS)) {
      for (const lang of REQUIRED_LANGS) {
        if (!dict[lang] || dict[lang].trim() === '') {
          missing.push(`TYPE_LABELS.${type}.${lang}`);
        }
      }
    }

    expect(missing).toEqual([]);
  });

  it('ensures all tp keys have translations for en, ar, es', () => {
    const missing = [];

    for (const [key, dict] of Object.entries(tp)) {
      for (const lang of REQUIRED_LANGS) {
        if (!dict[lang] || dict[lang].trim() === '') {
          missing.push(`tp.${key}.${lang}`);
        }
      }
    }

    expect(missing).toEqual([]);
  });
});
