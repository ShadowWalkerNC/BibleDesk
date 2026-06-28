import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ToastProvider } from '@/components/Toast/Toast';
import '@/app/globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title:       'BibleDesk — AI Bible Study',
  description: 'Ask any Bible question and get a deep, sourced answer covering scripture, history, original languages, theology, and practical application. Free.',
  keywords:    ['Bible study', 'Bible questions', 'theology', 'scripture', 'Christian'],
  authors:     [{ name: 'BibleDesk' }],
  openGraph: {
    title:       'BibleDesk — AI Bible Study',
    description: 'Five dimensions of truth for every Bible question.',
    type:        'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#06081a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
