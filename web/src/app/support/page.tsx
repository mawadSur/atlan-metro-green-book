import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// Static support page. Required for App Store submission and linked from App
// Store Connect's "Support URL" field (Guideline 1.5). Apple rejected the bare
// homepage as a support URL because it had no way for users to ask questions or
// request help — this page provides a real contact path, response expectations,
// and a short FAQ. Plain English so it is reviewable and indexable; no auth.
export const metadata: Metadata = {
  title: 'Support — Muslim Green Book',
  description:
    'Get help with the Muslim Green Book app: contact us, what to include when reporting an issue, and answers to common questions.',
};

const SUPPORT_EMAIL = 'mawad@surconsultinggroup.com';

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: 'Do I need an account to use the app?',
    a: (
      <>
        No. The app works without signing up or creating an account. You can
        browse mosques, halal restaurants, prayer spaces, prayer times, and the
        Qibla direction right away.
      </>
    ),
  },
  {
    q: 'How do I suggest a new place or add a listing?',
    a: (
      <>
        We&rsquo;d love your help keeping the directory accurate. Email us at the
        address above with the place&rsquo;s name, address, and what it is
        (mosque, halal restaurant, market, prayer space, and so on). We review
        suggestions and add verified places in app updates.
      </>
    ),
  },
  {
    q: 'A listing has incorrect information. How do I report it?',
    a: (
      <>
        Email us with the name of the place and what&rsquo;s wrong (for example,
        wrong address, hours, phone number, or halal status). Including a link or
        screenshot helps us fix it faster. We&rsquo;d rather under-promise than
        list something we can&rsquo;t confirm, so corrections are welcome.
      </>
    ),
  },
  {
    q: 'How do location and prayer times work?',
    a: (
      <>
        The app can use your device&rsquo;s location to show nearby places,
        calculate prayer times, and point the Qibla compass. This happens{' '}
        <strong>on your device</strong> — your location is not sent to our
        servers. You can use the app without granting location access; it falls
        back to a default city center for the metro Atlanta area.
      </>
    ),
  },
  {
    q: 'How do I turn notifications on or off?',
    a: (
      <>
        Notifications are opt-in. You can turn them on or off any time from the
        &ldquo;More&rdquo; tab in the app, or in your device&rsquo;s system
        settings. Turning them off in either place stops further messages.
      </>
    ),
  },
  {
    q: 'Is the app available in other languages?',
    a: (
      <>
        Yes. The app supports English, العربية (Arabic), and Español (Spanish).
        You can switch languages within the app.
      </>
    ),
  },
];

export default function SupportPage() {
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
          <h1 className="text-2xl font-bold text-stone-900">Support</h1>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6 text-stone-700 leading-relaxed">
          <p>
            Need help with Muslim Green Book? We&rsquo;re here. The app helps
            Muslims find mosques, halal restaurants, prayer spaces, prayer times,
            and the Qibla direction across metro Atlanta — and we want it to work
            well for you.
          </p>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-stone-900">
              How to get support
            </h2>
            <p>
              The best way to reach us is by email:{' '}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-teal-700 underline hover:text-teal-800"
              >
                {SUPPORT_EMAIL}
              </a>
              . We read every message and typically reply within 2&ndash;3
              business days.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-stone-900">
              What to include when you contact us
            </h2>
            <p>
              To help us resolve your issue quickly, please include:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your device and operating system (for example, iPhone 15, iOS 18)</li>
              <li>The app version (shown in the app&rsquo;s &ldquo;More&rdquo; tab)</li>
              <li>A clear description of the issue and what you expected to happen</li>
              <li>A screenshot, if you have one</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-stone-900">
              Frequently asked questions
            </h2>
            {FAQS.map(({ q, a }) => (
              <div key={q} className="space-y-1">
                <h3 className="font-semibold text-stone-900">{q}</h3>
                <p>{a}</p>
              </div>
            ))}
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-stone-900">Privacy</h2>
            <p>
              For details on how we handle your data, see our{' '}
              <Link
                href="/privacy"
                className="text-teal-700 underline hover:text-teal-800"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
