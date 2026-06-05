'use client';

import { useState, useEffect } from 'react';
import { Download, Info } from 'lucide-react';
import StoreBadges from './StoreBadges';
import { t } from '@/i18n/strings';
import type { Lang } from '@/lib/types';

interface InstallCTAProps {
  lang: Lang;
}

// Type for the PWA install hook (sibling agent's module)
// If @/lib/pwa exports these types, prefer the real import
interface InstallPromptState {
  isStandalone: boolean;
  canInstall: boolean;
  promptInstall: () => Promise<void>;
}

// Fallback hook implementation if @/lib/pwa not yet available
function useInstallPromptFallback(): InstallPromptState {
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running as standalone PWA
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    // Listen for beforeinstallprompt
    let deferredPrompt: any = null;
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const promptInstall = async () => {
    // Implementation will be in @/lib/pwa
  };

  return { isStandalone, canInstall, promptInstall };
}

// Try to import from @/lib/pwa, fall back to local implementation
let useInstallPrompt: () => InstallPromptState;
try {
  // This will be provided by sibling agent
  useInstallPrompt = require('@/lib/pwa').useInstallPrompt;
} catch {
  useInstallPrompt = useInstallPromptFallback;
}

export default function InstallCTA({ lang }: InstallCTAProps) {
  const { isStandalone, canInstall, promptInstall } = useInstallPrompt();

  // If already installed as PWA, don't show install CTA
  if (isStandalone) {
    return null;
  }

  const isIOS = typeof window !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Primary install action */}
      {canInstall ? (
        <button
          onClick={promptInstall}
          className="inline-flex items-center gap-2 px-6 py-3 bg-teal-700 hover:bg-emerald-800 text-white font-semibold rounded-lg transition-all duration-200 ease-out cursor-pointer active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 motion-safe:hover:scale-[1.02]"
          aria-label={t.landing_install[lang]}
        >
          <Download className="w-5 h-5" />
          <span>{t.landing_install[lang]}</span>
        </button>
      ) : isIOS ? (
        <div className="flex items-start gap-2 max-w-sm p-3 bg-teal-50 border border-teal-200 rounded-lg text-sm text-stone-700">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-teal-700" />
          <div>
            <div className="font-semibold text-teal-900 mb-1">{t.landing_install[lang]}</div>
            <div>{t.landing_install_ios_hint[lang]}</div>
          </div>
        </div>
      ) : null}

      {/* Store badges */}
      <StoreBadges lang={lang} />
    </div>
  );
}
