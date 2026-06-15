import type { Metadata } from 'next';

// The admin portal is intentionally undiscoverable: it is linked from nowhere
// in the app and must be reached by typing /admin directly. `noindex, nofollow`
// keeps it out of search engines. We deliberately do NOT add a robots.txt
// `Disallow: /admin` rule — robots.txt is public and would advertise the path.
// This child-segment metadata overrides the root layout's defaults for /admin.
export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
