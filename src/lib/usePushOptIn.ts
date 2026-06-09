import { useCallback, useEffect, useState } from 'react';
import { useLang } from './LangContext';
import {
  disablePush,
  enablePush,
  getPushOptIn,
  type PushOptInResult,
} from './push';

export type PushToggleState = {
  /** Whether this device is currently opted in (reflects server-backed reality). */
  enabled: boolean;
  /** True while loading the initial flag or processing a toggle. */
  busy: boolean;
  /** Set when the last enable attempt failed, so the UI can explain why. */
  lastError: Extract<PushOptInResult, { ok: false }>['reason'] | null;
  /** Flip the opt-in on/off. Resolves to the resulting enabled state. */
  toggle: (next: boolean) => Promise<boolean>;
};

/**
 * Backs the notifications toggle in the More tab. Loads the persisted opt-in
 * flag on mount, then drives enable/disable. Keeps the switch honest: if the OS
 * permission is denied (or the device can't receive push), `enabled` stays
 * false and `lastError` explains why.
 */
export function usePushOptIn(): PushToggleState {
  const { lang } = useLang();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(true);
  const [lastError, setLastError] =
    useState<PushToggleState['lastError']>(null);

  useEffect(() => {
    let mounted = true;
    getPushOptIn().then((v) => {
      if (mounted) {
        setEnabled(v);
        setBusy(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const toggle = useCallback(
    async (next: boolean): Promise<boolean> => {
      setBusy(true);
      setLastError(null);
      try {
        if (next) {
          const result = await enablePush(lang);
          if (result.ok) {
            setEnabled(true);
            return true;
          }
          setEnabled(false);
          setLastError(result.reason);
          return false;
        }
        await disablePush();
        setEnabled(false);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [lang]
  );

  return { enabled, busy, lastError, toggle };
}
