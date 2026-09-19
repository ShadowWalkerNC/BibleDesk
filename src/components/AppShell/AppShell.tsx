'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar/Sidebar';
import SlashCommandPalette from '@/components/SlashCommandPalette/SlashCommandPalette';
import styles from './AppShell.module.css';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  
  // Desktop (>= 1024px): expanded; Tablet (768px-1023px): compact rail; Mobile (< 768px): bottom rail
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    setCollapsed(mq.matches);
    const handler = (e: MediaQueryListEvent) => setCollapsed(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <div className={styles.shell}>
      <a href="#main-content" className={styles.skipLink}>
        Skip to content
      </a>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <main
        className={`${styles.main} ${collapsed ? styles.mainCollapsed : ''}`}
        id="main-content"
      >
        {children}
      </main>
      <SlashCommandPalette />
    </div>
  );
}
