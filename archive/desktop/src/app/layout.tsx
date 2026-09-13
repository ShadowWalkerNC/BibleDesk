// apps/desktop — Root layout
// Shares the web app's globals.css for the full design system.

import type { Metadata } from 'next';
import '@/app/globals.css';
import DesktopShell from './DesktopShell';

export const metadata: Metadata = {
  title:       'BibleDesk',
  description: 'BibleDesk — offline Bible study desktop app',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <DesktopShell>{children}</DesktopShell>
      </body>
    </html>
  );
}
