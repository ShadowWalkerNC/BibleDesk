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
  title:       'BibleDesk — Bible-first study',
  description: 'Read Scripture, follow plans, and study with notes. Optional AI assistant for five-dimension, citation-grounded answers.',
  keywords:    ['Bible study', 'Bible reader', 'theology', 'scripture', 'Christian', 'reading plans'],
  authors:     [{ name: 'BibleDesk' }],
  manifest:    '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'BibleDesk',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    title:       'BibleDesk — Bible-first study',
    description: 'Read Scripture first. AI assists when you want it.',
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

