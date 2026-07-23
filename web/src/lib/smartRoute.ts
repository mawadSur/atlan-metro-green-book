import { storeLinks, hasStoreLink } from './storeLinks';

export type InstallTarget = 'ios' | 'android' | 'web';

const IOS_RE = /iPhone|iPad|iPod/i;
const ANDROID_RE = /Android/i;

export function detectInstallTarget(userAgent: string | null | undefined): InstallTarget {
  const ua = userAgent ?? '';
  if (IOS_RE.test(ua)) return 'ios';
  if (ANDROID_RE.test(ua)) return 'android';
  return 'web';
}

export function appendTrackingParams(destination: URL, source: URL): URL {
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign']) {
    const value = source.searchParams.get(key);
    if (value) destination.searchParams.set(key, value.slice(0, 128));
  }

  const sourceCode = source.searchParams.get('source');
  if (sourceCode && !destination.searchParams.has('utm_source')) {
    destination.searchParams.set('utm_source', sourceCode.slice(0, 128));
  }

  return destination;
}

export function getSmartInstallUrl(requestUrl: string, userAgent?: string | null): string {
  const source = new URL(requestUrl);
  const target = detectInstallTarget(userAgent);

  let destination: URL;
  if (target === 'ios' && hasStoreLink(storeLinks.appStoreUrl)) {
    destination = new URL(storeLinks.appStoreUrl);
  } else if (target === 'android' && hasStoreLink(storeLinks.playStoreUrl)) {
    destination = new URL(storeLinks.playStoreUrl);
  } else {
    destination = new URL('/', source.origin);
  }

  return appendTrackingParams(destination, source).toString();
}
