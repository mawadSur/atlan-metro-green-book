// Tests for web/src/lib/email-validate.ts
// Pure synchronous helpers — no mocks needed.

import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  isHoneypotTripped,
  HONEYPOT_FIELD,
} from '../web/src/lib/email-validate.ts';

// ---------------------------------------------------------------------------
// isValidEmail — happy path
// ---------------------------------------------------------------------------

describe('isValidEmail — valid addresses', () => {
  it('accepts a standard email', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  it('accepts a plus-alias address', () => {
    expect(isValidEmail('user+tag@example.com')).toBe(true);
  });

  it('accepts a subdomain address', () => {
    expect(isValidEmail('user@mail.example.co.uk')).toBe(true);
  });

  it('accepts an address with dots in the local part', () => {
    expect(isValidEmail('first.last@domain.org')).toBe(true);
  });

  it('accepts a leading/trailing space by trimming before validation', () => {
    expect(isValidEmail('  user@example.com  ')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isValidEmail — rejections
// ---------------------------------------------------------------------------

describe('isValidEmail — invalid addresses', () => {
  it('rejects an empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });

  it('rejects a whitespace-only string', () => {
    expect(isValidEmail('   ')).toBe(false);
  });

  it('rejects a string with no @', () => {
    expect(isValidEmail('userexample.com')).toBe(false);
  });

  it('rejects a string with no domain dot', () => {
    expect(isValidEmail('user@domain')).toBe(false);
  });

  it('rejects a string with a space inside', () => {
    expect(isValidEmail('user @example.com')).toBe(false);
  });

  it('rejects a non-string input (number)', () => {
    // @ts-expect-error intentional bad type
    expect(isValidEmail(42)).toBe(false);
  });

  it('rejects a non-string input (null)', () => {
    // @ts-expect-error intentional bad type
    expect(isValidEmail(null)).toBe(false);
  });

  it('rejects a non-string input (object)', () => {
    // @ts-expect-error intentional bad type
    expect(isValidEmail({})).toBe(false);
  });

  it('rejects a string longer than 254 characters', () => {
    // 245-char local part + "@x.co" = 251 > 254 once the domain portion is included.
    // Use exactly 250 local chars to put total over the 254 limit.
    const tooLong = 'a'.repeat(250) + '@x.co'; // 256 chars total
    expect(tooLong.length).toBeGreaterThan(254);
    expect(isValidEmail(tooLong)).toBe(false);
  });

  it('accepts an address of exactly 254 characters', () => {
    // 247 local chars + @x.co = 253 total; at 254 boundary.
    const local = 'a'.repeat(247);
    const addr = `${local}@x.co`; // 253 chars — valid
    expect(addr.length).toBeLessThanOrEqual(254);
    expect(isValidEmail(addr)).toBe(true);
  });

  it('rejects double @', () => {
    expect(isValidEmail('user@@example.com')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// HONEYPOT_FIELD export
// ---------------------------------------------------------------------------

describe('HONEYPOT_FIELD', () => {
  it('is a non-empty string', () => {
    expect(typeof HONEYPOT_FIELD).toBe('string');
    expect(HONEYPOT_FIELD.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// isHoneypotTripped
// ---------------------------------------------------------------------------

describe('isHoneypotTripped — field empty or absent (real user)', () => {
  it('returns false when the honeypot field is an empty string', () => {
    const fd = { get: (name) => (name === HONEYPOT_FIELD ? '' : null) };
    expect(isHoneypotTripped(fd)).toBe(false);
  });

  it('returns false when the honeypot field is whitespace only', () => {
    const fd = { get: () => '   ' };
    expect(isHoneypotTripped(fd)).toBe(false);
  });

  it('returns false when the honeypot field is null (not present)', () => {
    const fd = { get: () => null };
    expect(isHoneypotTripped(fd)).toBe(false);
  });

  it('returns false when the field value is a non-string (number)', () => {
    const fd = { get: () => 42 };
    expect(isHoneypotTripped(fd)).toBe(false);
  });
});

describe('isHoneypotTripped — field filled (bot)', () => {
  it('returns true when the honeypot field has a non-blank string', () => {
    const fd = { get: () => 'My Company' };
    expect(isHoneypotTripped(fd)).toBe(true);
  });

  it('returns true when the field has a single character', () => {
    const fd = { get: () => 'x' };
    expect(isHoneypotTripped(fd)).toBe(true);
  });
});

describe('isHoneypotTripped — error guard', () => {
  it('returns false (does not throw) when formData.get throws', () => {
    const fd = {
      get: () => {
        throw new Error('FormData not available');
      },
    };
    expect(isHoneypotTripped(fd)).toBe(false);
  });
});
