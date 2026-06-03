import type { Metadata, Viewport } from "next";
import { Geist, Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const notoArabic = Noto_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
});

export const metadata: Metadata = {
  title: "Atlan Metro Green Book — Muslim-Friendly Places in Atlanta",
  description:
    "Find mosques, halal restaurants, markets and family attractions across Metro Atlanta. Bilingual English / العربية / Español. Built for the FIFA World Cup 2026.",
  openGraph: {
    title: "Atlan Metro Green Book",
    description: "Muslim-friendly places across Metro Atlanta — mosques, halal food, markets and more.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${notoArabic.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-900">
        {children}
      </body>
    </html>
  );
}
