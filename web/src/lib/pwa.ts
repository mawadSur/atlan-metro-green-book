// PWA utilities: service worker registration + install prompt management

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Deferred install prompt
let deferredPrompt: BeforeInstallPromptEvent | null = null;

// Capture beforeinstallprompt event (browser install prompt)
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
  });
}

/**
 * Check if the install prompt is available.
 * Returns true if the browser supports PWA install AND the user hasn't installed yet.
 */
export function canInstall(): boolean {
  return deferredPrompt !== null;
}

/**
 * Check if the app is running in standalone mode (already installed).
 */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;

  // iOS Safari
  if ("standalone" in window.navigator) {
    return (window.navigator as any).standalone === true;
  }

  // Chrome/Edge/Firefox
  return window.matchMedia("(display-mode: standalone)").matches;
}

/**
 * Prompt the user to install the PWA.
 * Returns true if user accepted, false if dismissed.
 * Throws if called when canInstall() is false.
 */
export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) {
    throw new Error("Install prompt not available. Call canInstall() first.");
  }

  await deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;

  // Clear the prompt (can only be used once)
  deferredPrompt = null;

  return outcome === "accepted";
}

/**
 * Register the service worker (production only).
 * Handles updates with automatic reload on new version.
 */
export function registerServiceWorker(): void {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV !== "production") return;
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Check for updates every hour
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);

        // Handle update found
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New version available — auto-reload after a short delay
              // (gives the user time to finish their current action)
              setTimeout(() => {
                window.location.reload();
              }, 1500);
            }
          });
        });
      })
      .catch((error) => {
        console.error("Service worker registration failed:", error);
      });
  });
}

/**
 * React hook for install prompt state.
 * Usage:
 *   const { canInstall, isStandalone, promptInstall } = useInstallPrompt();
 */
export function useInstallPrompt() {
  // Simple hook — returns current state + prompt function
  // (For full React integration, wrap in useState + useEffect in the component)
  return {
    canInstall: canInstall(),
    isStandalone: isStandalone(),
    promptInstall,
  };
}
