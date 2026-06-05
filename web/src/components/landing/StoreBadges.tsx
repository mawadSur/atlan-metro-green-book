'use client';

import { Apple, Smartphone } from 'lucide-react';
import { storeLinks, hasStoreLink } from '@/lib/storeLinks';
import { t } from '@/i18n/strings';
import type { Lang } from '@/lib/types';

interface StoreBadgesProps {
  lang: Lang;
}

export default function StoreBadges({ lang }: StoreBadgesProps) {
  const hasAppStore = hasStoreLink(storeLinks.appStoreUrl);
  const hasPlayStore = hasStoreLink(storeLinks.playStoreUrl);

  return (
    <div className="flex flex-wrap items-center gap-3 justify-center">
      {/* App Store Badge */}
      <StoreBadge
        href={storeLinks.appStoreUrl}
        enabled={hasAppStore}
        icon={<Apple className="w-6 h-6" />}
        label={t.landing_appstore[lang]}
        sublabel={hasAppStore ? t.landing_appstore[lang] : t.landing_store_coming_soon[lang]}
        ariaLabel={
          hasAppStore
            ? t.landing_appstore[lang]
            : `${t.landing_appstore[lang]} - ${t.landing_store_coming_soon[lang]}`
        }
      />

      {/* Play Store Badge */}
      <StoreBadge
        href={storeLinks.playStoreUrl}
        enabled={hasPlayStore}
        icon={<Smartphone className="w-6 h-6" />}
        label={t.landing_playstore[lang]}
        sublabel={hasPlayStore ? t.landing_playstore[lang] : t.landing_store_coming_soon[lang]}
        ariaLabel={
          hasPlayStore
            ? t.landing_playstore[lang]
            : `${t.landing_playstore[lang]} - ${t.landing_store_coming_soon[lang]}`
        }
      />
    </div>
  );
}

interface StoreBadgeProps {
  href: string;
  enabled: boolean;
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  ariaLabel: string;
}

function StoreBadge({ href, enabled, icon, label, sublabel, ariaLabel }: StoreBadgeProps) {
  const classes = `
    inline-flex items-center gap-2.5 px-5 py-3 min-h-[44px] rounded-lg
    border-2 transition-all duration-200 ease-out
    ${
      enabled
        ? 'bg-stone-900 border-stone-900 text-white cursor-pointer hover:bg-stone-800 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2'
        : 'bg-stone-100 border-stone-200 text-stone-400 cursor-not-allowed'
    }
  `.trim();

  const content = (
    <>
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex flex-col items-start min-w-0">
        <span className="text-xs leading-tight">{sublabel}</span>
        <span className="text-sm font-semibold leading-tight">{label}</span>
      </div>
    </>
  );

  if (!enabled) {
    return (
      <div className={classes} aria-disabled="true" aria-label={ariaLabel} role="button">
        {content}
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={classes}
      aria-label={ariaLabel}
    >
      {content}
    </a>
  );
}
