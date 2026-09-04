'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar/Sidebar';
import SlashCommandPalette from '@/components/SlashCommandPalette/SlashCommandPalette';
import LiveRadioPlayer from '@/components/LiveRadioPlayer/LiveRadioPlayer';
import styles from './AppShell.module.css';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  
  // On mobile, start collapsed
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setCollapsed(mq.matches);
    const handler = (e: MediaQueryListEvent) => setCollapsed(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <div className={styles.shell}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <main
        className={`${styles.main} ${collapsed ? styles.mainCollapsed : ''}`}
        id="main-content"
      >
        {children}
      </main>
      <SlashCommandPalette />
      <LiveRadioPlayer />
    </div>
  );
}
