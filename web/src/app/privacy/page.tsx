import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// Static privacy policy. Required for App Store / Play Store submission and
// linked from App Store Connect's "Privacy Policy URL" field. Covers the three
// data surfaces the apps touch: device location (on-device only), email
// signups (web), and push notification tokens (mobile). Plain English so it is
// reviewable; this is the legally-binding copy — review wording before launch.
export const metadata: Metadata = {
  title: 'Privacy Policy — Atlan Metro Green Book',
  description:
    'How the Atlan Metro Green Book website and mobile app handle your data: location, email signups, and push notifications.',
};

// Keep this in sync when data practices change.
const LAST_UPDATED = 'June 8, 2026';

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-stone-50">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center justify-center w-11 h-11 rounded-full bg-white border border-stone-200 text-stone-900 hover:bg-stone-50 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-stone-900">Privacy Policy</h1>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6 text-stone-700 leading-relaxed">
          <p className="text-sm text-stone-500">Last updated: {LAST_UPDATED}</p>

          <p>
            Atlan Metro Green Book (&ldquo;we&rdquo;, &ldquo;us&rdquo;) helps
            Muslims find mosques, halal restaurants, prayer spaces, prayer times,
            and the Qibla direction across Metro Atlanta and FIFA World Cup 2026
            host cities. This policy explains what data the website and mobile
            apps collect and how it is used. We collect as little as possible.
          </p>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-stone-900">Location</h2>
            <p>
              The app can use your device&rsquo;s location to show nearby places,
              calculate prayer times, and point the Qibla compass. Location is
              used <strong>only on your device</strong> to compute these results.
              We do not collect, store, or transmit your location to our servers,
              and you can use the app without granting location access (it falls
              back to a default city center).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-stone-900">
              Email signups
            </h2>
            <p>
              If you choose to sign up for updates on the website, we store the
              email address you provide and an audience tag (visitor or local) so
              we can send launch and event news. We never sell or share this list,
              and the list cannot be read back out publicly. To stop receiving
              messages or have your email removed, contact us at the address
              below.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-stone-900">
              Push notifications
            </h2>
            <p>
              If you opt in to notifications in the mobile app, we store an
              anonymous device push token (provided by Apple or Google via the
              Expo push service) and your language preference, solely to send you
              match alerts and announcements. The token is not linked to your
              identity and cannot be read back out publicly. You can turn
              notifications off at any time in the app&rsquo;s &ldquo;More&rdquo;
              tab or in your device settings, which disables further messages.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-stone-900">Analytics</h2>
            <p>
              We use privacy-friendly, aggregate analytics to understand how the
              website is used (for example, how many people viewed a match page).
              This does not identify you individually.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-stone-900">
              Children&rsquo;s privacy
            </h2>
            <p>
              The app is intended for a general audience and is not directed at
              children under 13. We do not knowingly collect personal information
              from children.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-stone-900">Contact</h2>
            <p>
              Questions about this policy or requests to remove your data? Email{' '}
              <a
                href="mailto:mawad@surconsultinggroup.com"
                className="text-teal-700 underline hover:text-teal-800"
              >
                mawad@surconsultinggroup.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
