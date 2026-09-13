import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ToastProvider } from '@/components/Toast/Toast';
import AppShell from '@/components/AppShell/AppShell';
import '@/app/globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title:       'BibleDesk — Local-first Bible study',
  description: 'Read and search six public-domain Bible translations offline. Explore Strong’s lexicons, TSK cross-references, prayer tools, and an optional study assistant.',
  keywords:    ['Bible study', 'Bible reader', 'theology', 'scripture', 'Christian', 'reading plans'],
  authors:     [{ name: 'BibleDesk' }],
  manifest:    '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'BibleDesk',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    title:       'BibleDesk — Local-first Bible study',
    description: 'Read and search public-domain Scripture offline. Explore study resources, prayer tools, and an optional five-dimension assistant.',
    type:        'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#f7f3e8',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <ToastProvider>
          <AppShell>
            {children}
          </AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}

