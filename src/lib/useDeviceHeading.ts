import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import type { LocationHeadingObject, LocationSubscription } from 'expo-location';

export interface DeviceHeading {
  /** True heading in degrees (requires location permission; -1 if unavailable) */
  heading: number;
  /** Calibration accuracy: 3=high, 2=medium, 1=low, 0=none */
  accuracy: number;
  /** Whether location permission is granted */
  hasPermission: boolean;
  /** Request location permission */
  requestPermission: () => Promise<void>;
}

export function useDeviceHeading(): DeviceHeading {
  const [heading, setHeading] = useState<number>(-1);
  const [accuracy, setAccuracy] = useState<number>(0);
  const [hasPermission, setHasPermission] = useState<boolean>(false);

  // Check and request permission
  const checkPermission = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    setHasPermission(status === 'granted');
    return status === 'granted';
  };

  const requestPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  useEffect(() => {
    let subscription: LocationSubscription | null = null;

    const startWatching = async () => {
      const granted = await checkPermission();
      if (!granted) return;

      try {
        subscription = await Location.watchHeadingAsync(
          (headingObj: LocationHeadingObject) => {
            setHeading(headingObj.trueHeading);
            setAccuracy(headingObj.accuracy);
          },
          (error: string) => {
            console.warn('Heading error:', error);
          }
        );
      } catch (err) {
        console.warn('Failed to start heading watch:', err);
      }
    };

    startWatching();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [hasPermission]);

  return {
    heading,
    accuracy,
    hasPermission,
    requestPermission,
  };
}
