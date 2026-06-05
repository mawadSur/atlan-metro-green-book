/**
 * App Store and Play Store configuration for native app download links.
 *
 * No native app published yet — leave URLs empty to render "Coming soon" state.
 * Paste the real https:// URL here when the App Store / Play Store listing is live.
 *
 * @example
 * // When published, update to:
 * // appStoreUrl: 'https://apps.apple.com/app/id...'
 * // playStoreUrl: 'https://play.google.com/store/apps/details?id=...'
 */
export const storeLinks = {
  appStoreUrl: '' as string,
  playStoreUrl: '' as string,
};

export type StoreLinks = typeof storeLinks;

/**
 * Type guard to check if a store URL is configured and valid.
 *
 * @param url - Store URL to check (can be null, undefined, or empty string)
 * @returns true if URL exists and is non-empty, false otherwise
 */
export function hasStoreLink(url: string | null | undefined): boolean {
  return typeof url === 'string' && url.trim().length > 0;
}
