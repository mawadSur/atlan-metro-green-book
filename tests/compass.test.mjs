// Tests for web/src/lib/compass.ts
// All functions are pure and require no browser APIs, so no stubs needed.

import { describe, it, expect, beforeEach } from 'vitest';
import {
  HeadingFilter,
  getAccuracyLevel,
  extractHeading,
  computeCalibrationState,
  getCardinalDirection,
} from '../web/src/lib/compass.ts';

// --------------------------------------------------------------------------
// HeadingFilter
// --------------------------------------------------------------------------

describe('HeadingFilter — basic operation', () => {
  it('returns the single value when buffer has one entry', () => {
    const f = new HeadingFilter();
    expect(f.add(90)).toBeCloseTo(90, 3);
  });

  it('averages two headings in the same quadrant', () => {
    const f = new HeadingFilter();
    f.add(10);
    const result = f.add(20);
    expect(result).toBeCloseTo(15, 1);
  });

  it('respects maxSize — evicts oldest entry when buffer is full (size 1)', () => {
    const f = new HeadingFilter(1);
    f.add(100);
    // Buffer full: [100]. Adding 200 evicts 100 → [200].
    expect(f.add(200)).toBeCloseTo(200, 3);
  });

  it('respects maxSize — mean shifts once old values are evicted (size 2)', () => {
    const f = new HeadingFilter(2);
    f.add(80);
    f.add(80); // buffer full: [80, 80], mean ≈ 80
    // Evict first 80, add 10 → [80, 10], mean ≈ 45
    const result = f.add(10);
    expect(result).toBeGreaterThan(30);
    expect(result).toBeLessThan(60);
  });

  it('reset clears the buffer so the next add returns only that value', () => {
    const f = new HeadingFilter();
    f.add(45);
    f.add(90);
    f.reset();
    expect(f.add(200)).toBeCloseTo(200, 3);
  });
});

describe('HeadingFilter — circular (wrap-around) mean', () => {
  it('correctly averages headings that straddle 0°/360°', () => {
    const f = new HeadingFilter(2);
    f.add(350);
    const result = f.add(10);
    // Circular mean of 350 and 10 is 0 (north), not 180 (south).
    // Allow ±5° because of floating point.
    expect(result < 15 || result > 345).toBe(true);
  });

  it('handles exactly 0 and 360 as the same direction', () => {
    const f = new HeadingFilter(2);
    f.add(0);
    const result = f.add(360);
    // Both are north — mean should be near 0 (or 360).
    expect(result < 5 || result > 355).toBe(true);
  });
});

// --------------------------------------------------------------------------
// getAccuracyLevel
// --------------------------------------------------------------------------

describe('getAccuracyLevel', () => {
  it('returns "low" for null accuracy', () => {
    expect(getAccuracyLevel(null)).toBe('low');
  });

  it('returns "low" for negative accuracy (calibration failed)', () => {
    expect(getAccuracyLevel(-1)).toBe('low');
    expect(getAccuracyLevel(-999)).toBe('low');
  });

  it('returns "high" for accuracy exactly 0 (perfect)', () => {
    expect(getAccuracyLevel(0)).toBe('high');
  });

  it('returns "high" for accuracy <= 15', () => {
    expect(getAccuracyLevel(1)).toBe('high');
    expect(getAccuracyLevel(15)).toBe('high');
  });

  it('returns "medium" for accuracy 16–30', () => {
    expect(getAccuracyLevel(16)).toBe('medium');
    expect(getAccuracyLevel(30)).toBe('medium');
  });

  it('returns "low" for accuracy > 30', () => {
    expect(getAccuracyLevel(31)).toBe('low');
    expect(getAccuracyLevel(180)).toBe('low');
  });
});

// --------------------------------------------------------------------------
// extractHeading
// --------------------------------------------------------------------------

/** Minimal DeviceOrientationEvent-like object. */
function makeEvent(overrides = {}) {
  return {
    absolute: false,
    alpha: null,
    beta: null,
    gamma: null,
    ...overrides,
  };
}

describe('extractHeading — iOS webkitCompassHeading path', () => {
  it('returns heading + accuracy + absolute:true for a valid webkit event', () => {
    const event = makeEvent({ webkitCompassHeading: 120, webkitCompassAccuracy: 10 });
    const result = extractHeading(event);
    expect(result).not.toBeNull();
    expect(result.heading).toBe(120);
    expect(result.accuracy).toBe(10);
    expect(result.absolute).toBe(true);
  });

  it('returns accuracy:null when webkitCompassAccuracy is absent', () => {
    const event = makeEvent({ webkitCompassHeading: 45 });
    const result = extractHeading(event);
    expect(result).not.toBeNull();
    expect(result.accuracy).toBeNull();
    expect(result.absolute).toBe(true);
  });

  it('converts webkitCompassHeading 0 to heading 0 (north)', () => {
    const event = makeEvent({ webkitCompassHeading: 0, webkitCompassAccuracy: 5 });
    expect(extractHeading(event).heading).toBe(0);
  });
});

describe('extractHeading — absolute DeviceOrientation path', () => {
  it('converts alpha to heading for an absolute event (alpha=90 → heading=270)', () => {
    // heading = (360 - alpha) % 360
    const event = makeEvent({ absolute: true, alpha: 90 });
    const result = extractHeading(event);
    expect(result).not.toBeNull();
    expect(result.heading).toBe(270);
    expect(result.absolute).toBe(true);
  });

  it('converts alpha=0 to heading 0 (360 % 360 = 0)', () => {
    const event = makeEvent({ absolute: true, alpha: 0 });
    expect(extractHeading(event).heading).toBe(0);
  });

  it('always returns accuracy:null (non-webkit path has no accuracy field)', () => {
    const event = makeEvent({ absolute: true, alpha: 180 });
    expect(extractHeading(event).accuracy).toBeNull();
  });
});

describe('extractHeading — non-absolute DeviceOrientation path', () => {
  it('returns a heading with absolute:false for a relative orientation event', () => {
    const event = makeEvent({ absolute: false, alpha: 45 });
    const result = extractHeading(event);
    expect(result).not.toBeNull();
    expect(result.absolute).toBe(false);
    expect(result.heading).toBe(315); // (360 - 45) % 360
  });
});

describe('extractHeading — null cases', () => {
  it('returns null when alpha is null and no webkit heading is present', () => {
    const event = makeEvent({ absolute: false, alpha: null });
    expect(extractHeading(event)).toBeNull();
  });

  it('returns null for an empty event object', () => {
    expect(extractHeading(makeEvent())).toBeNull();
  });
});

// --------------------------------------------------------------------------
// computeCalibrationState
// --------------------------------------------------------------------------

const HD_GOOD = { heading: 45, accuracy: 5, absolute: true };
const HD_LOW_ACC = { heading: 45, accuracy: 50, absolute: true };
const HD_NON_ABS = { heading: 45, accuracy: 5, absolute: false };

describe('computeCalibrationState', () => {
  it('returns "unavailable" when compass is not available', () => {
    expect(computeCalibrationState(HD_GOOD, true, false)).toBe('unavailable');
  });

  it('returns "idle" when permission has not been granted', () => {
    expect(computeCalibrationState(null, false, true)).toBe('idle');
    expect(computeCalibrationState(HD_GOOD, false, true)).toBe('idle');
  });

  it('returns "unavailable" when headingData is null (no reading yet)', () => {
    expect(computeCalibrationState(null, true, true)).toBe('unavailable');
  });

  it('returns "unavailable" for a non-absolute heading (device limitation)', () => {
    expect(computeCalibrationState(HD_NON_ABS, true, true)).toBe('unavailable');
  });

  it('returns "calibrated" for high accuracy absolute heading', () => {
    expect(computeCalibrationState(HD_GOOD, true, true)).toBe('calibrated');
  });

  it('returns "calibrated" for medium accuracy absolute heading', () => {
    const hd = { heading: 45, accuracy: 20, absolute: true };
    expect(computeCalibrationState(hd, true, true)).toBe('calibrated');
  });

  it('returns "calibrating" for low accuracy absolute heading', () => {
    expect(computeCalibrationState(HD_LOW_ACC, true, true)).toBe('calibrating');
  });

  it('returns "calibrating" when accuracy is null (not yet measured)', () => {
    const hd = { heading: 45, accuracy: null, absolute: true };
    expect(computeCalibrationState(hd, true, true)).toBe('calibrating');
  });
});

// --------------------------------------------------------------------------
// getCardinalDirection
// --------------------------------------------------------------------------

describe('getCardinalDirection', () => {
  const CASES = [
    [0, 'N'],
    [22.4, 'N'],   // just inside N range
    [22.5, 'NE'],  // boundary: NE starts at 22.5
    [45, 'NE'],
    [67.4, 'NE'],
    [67.5, 'E'],
    [90, 'E'],
    [112.4, 'E'],
    [112.5, 'SE'],
    [135, 'SE'],
    [157.4, 'SE'],
    [157.5, 'S'],
    [180, 'S'],
    [202.4, 'S'],
    [202.5, 'SW'],
    [225, 'SW'],
    [247.4, 'SW'],
    [247.5, 'W'],
    [270, 'W'],
    [292.4, 'W'],
    [292.5, 'NW'],
    [315, 'NW'],
    [337.4, 'NW'],
    [337.5, 'N'],  // wraps back to N
    [359.9, 'N'],
    [360, 'N'],    // 360 === 0
  ];

  for (const [deg, expected] of CASES) {
    it(`${deg}° → ${expected}`, () => {
      expect(getCardinalDirection(deg)).toBe(expected);
    });
  }

  it('handles negative degrees (wraps correctly)', () => {
    // -45° = 315° = NW
    expect(getCardinalDirection(-45)).toBe('NW');
    // -90° = 270° = W
    expect(getCardinalDirection(-90)).toBe('W');
  });

  it('handles degrees > 360 (wraps correctly)', () => {
    // 405° = 45° = NE
    expect(getCardinalDirection(405)).toBe('NE');
    // 720° = 0° = N
    expect(getCardinalDirection(720)).toBe('N');
  });
});
