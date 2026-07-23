/**
 * App Store and Play Store configuration for native app download links.
 *
 * The iOS App Store listing is live; Android remains in "Coming soon" state
 * until the Play Store listing is published.
 *
 * @example
 * // When published, update to:
 * // playStoreUrl: 'https://play.google.com/store/apps/details?id=...'
 */
export const storeLinks = {
  appStoreUrl: 'https://apps.apple.com/us/app/muslim-green-book/id6778497186' as string,
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
