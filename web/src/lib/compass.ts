/**
 * Compass calibration and heading utilities for Qibla compass.
 * Handles iOS webkitCompassHeading, absolute orientation, and accuracy tracking.
 */

export type CalibrationState =
  | 'idle'
  | 'requesting'
  | 'calibrating'
  | 'calibrated'
  | 'needsRecalibration'
  | 'unavailable';

export type AccuracyLevel = 'high' | 'medium' | 'low';

export interface HeadingData {
  heading: number; // true north, clockwise 0-360
  accuracy: number | null; // degrees (iOS webkitCompassAccuracy)
  absolute: boolean; // whether this is an absolute heading
}

/**
 * Low-pass filter for smoothing compass heading (circular averaging).
 */
export class HeadingFilter {
  private buffer: number[] = [];
  private maxSize: number;

  constructor(bufferSize: number = 5) {
    this.maxSize = bufferSize;
  }

  add(heading: number): number {
    this.buffer.push(heading);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }

    // Circular mean for compass headings
    const rad = Math.PI / 180;
    const sinSum = this.buffer.reduce((sum, h) => sum + Math.sin(h * rad), 0);
    const cosSum = this.buffer.reduce((sum, h) => sum + Math.cos(h * rad), 0);
    const meanRad = Math.atan2(sinSum, cosSum);
    const meanDeg = (meanRad / rad + 360) % 360;

    return meanDeg;
  }

  reset() {
    this.buffer = [];
  }
}

/**
 * Determine accuracy level from iOS webkitCompassAccuracy or estimate.
 */
export function getAccuracyLevel(accuracy: number | null): AccuracyLevel {
  if (accuracy === null || accuracy < 0) return 'low';
  if (accuracy <= 15) return 'high';
  if (accuracy <= 30) return 'medium';
  return 'low';
}

/**
 * Extract heading from DeviceOrientationEvent.
 * Returns null if no reliable heading available.
 */
export function extractHeading(event: DeviceOrientationEvent): HeadingData | null {
  // iOS Safari: webkitCompassHeading is true-north, clockwise
  if ('webkitCompassHeading' in event && typeof (event as any).webkitCompassHeading === 'number') {
    const heading = (event as any).webkitCompassHeading as number;
    const accuracy = 'webkitCompassAccuracy' in event
      ? ((event as any).webkitCompassAccuracy as number)
      : null;
    return { heading, accuracy, absolute: true };
  }

  // deviceorientationabsolute with alpha
  if (event.absolute && event.alpha !== null) {
    // Alpha is compass bearing: 0=N, 90=E, 180=S, 270=W
    // Convert to heading: 0=N, 90=E clockwise
    const heading = (360 - event.alpha) % 360;
    return { heading, accuracy: null, absolute: true };
  }

  // Non-absolute deviceorientation: unreliable
  if (!event.absolute && event.alpha !== null) {
    // Mark as non-absolute so UI can warn user
    const heading = (360 - event.alpha) % 360;
    return { heading, accuracy: null, absolute: false };
  }

  return null;
}

/**
 * Compute calibration state from accuracy and absolute heading.
 */
export function computeCalibrationState(
  headingData: HeadingData | null,
  permissionGranted: boolean,
  compassAvailable: boolean
): CalibrationState {
  if (!compassAvailable) return 'unavailable';
  if (!permissionGranted) return 'idle';
  if (!headingData) return 'unavailable';

  // If not absolute, device can't provide reliable heading
  if (!headingData.absolute) return 'unavailable';

  const level = getAccuracyLevel(headingData.accuracy);
  if (level === 'low') {
    // First reading with low accuracy: calibrating
    // Persistent low accuracy: needsRecalibration
    return 'calibrating'; // Caller should track if this persists
  }
  if (level === 'medium' || level === 'high') return 'calibrated';

  return 'calibrating';
}

/**
 * Get cardinal direction from bearing.
 */
export function getCardinalDirection(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return 'N';
  if (normalized >= 22.5 && normalized < 67.5) return 'NE';
  if (normalized >= 67.5 && normalized < 112.5) return 'E';
  if (normalized >= 112.5 && normalized < 157.5) return 'SE';
  if (normalized >= 157.5 && normalized < 202.5) return 'S';
  if (normalized >= 202.5 && normalized < 247.5) return 'SW';
  if (normalized >= 247.5 && normalized < 292.5) return 'W';
  return 'NW';
}
