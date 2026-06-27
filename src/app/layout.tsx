import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'BibleDesk — AI-Powered Bible Study', template: '%s | BibleDesk' },
  description:
    'Free AI-powered Bible study platform. Ask any Bible question and receive deep, multi-dimensional answers covering scripture, history, original languages, theology, and practical application.',
  keywords: ['Bible study', 'AI Bible', 'scripture', 'Christian', 'church', 'pastor', 'youth group', 'theology'],
  authors: [{ name: 'ShadowWalkerNC' }],
  openGraph: {
    type: 'website',
    title: 'BibleDesk — AI-Powered Bible Study',
    description: 'Free AI Bible study platform with 5-dimension sourced answers.',
    siteName: 'BibleDesk',
  },
  manifest: '/manifest.json',
  icons: { icon: '/favicon.ico', apple: '/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  themeColor: '#0b0f2e',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
