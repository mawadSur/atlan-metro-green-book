// Shared client-side store over the saveList localStorage.
//
// NO directive — pure module, imported only by client components. It lets every
// island that reads the saved set (the ♡ SaveToggle hearts AND the "Share my
// plan" button) re-render together the instant any one of them mutates the list,
// instead of each keeping a private listener set. useSyncExternalStore consumers
// pass their own primitive getSnapshot (a boolean for one id, a count for all).

const listeners = new Set<() => void>();

/** Notify all subscribers that the saved set changed (call after a toggle). */
export function emitSavedChange(): void {
  for (const l of listeners) l();
}

/** Subscribe to saved-set changes, including cross-tab `storage` events. */
export function subscribeSaved(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = () => cb();
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}
