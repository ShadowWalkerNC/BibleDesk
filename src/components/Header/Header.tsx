'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Search, BookOpen, LogIn, LogOut, Radio } from 'lucide-react';
import { getBrowserClient } from '@/lib/supabase';
import QuickJumpModal from '@/components/QuickJumpModal/QuickJumpModal';
import styles from './Header.module.css';

const NAV_LINKS = [
  { href: '/bible',       label: 'Study Desk' },
  { href: '/plans',       label: 'Plans' },
  { href: '/daily',       label: 'Daily' },
  { href: '/#assistant',  label: '5D Assistant' },
  { href: '/sermons',     label: 'Notes & Outlines' },
  { href: '/prayer',      label: 'Prayer' },
  { href: '/history',     label: 'History' },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isJumpOpen, setIsJumpOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsJumpOpen(true);
    document.addEventListener('bibledesk:open-quick-jump', handleOpen);
    return () => document.removeEventListener('bibledesk:open-quick-jump', handleOpen);
  }, []);

  useEffect(() => {
    const supabase = getBrowserClient();
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    const supabase = getBrowserClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <>
      <header className={styles.header} role="banner">
        <div className={styles.inner}>
          <Link href="/" className={styles.logo} aria-label="BibleDesk Home">
            <div className={styles.logoIcon} aria-hidden="true">✦</div>
            <span className={styles.logoText}>
              Bible<span>Desk</span>
            </span>
          </Link>

          <button
            onClick={() => setIsJumpOpen(true)}
            className={styles.quickJumpBtn}
            title="Quick Jump to any book or chapter (Ctrl+K)"
          >
            <Search size={15} className={styles.quickJumpIcon} />
            <span className={styles.quickJumpText}>Jump to Book / Chapter...</span>
            <kbd className={styles.quickJumpKbd}>Ctrl K</kbd>
          </button>

          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('bibledesk:open-radio'))}
            title="Open Christian Worship Radio & Ambient Praise"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(181, 132, 20, 0.12)',
              border: '1px solid rgba(181, 132, 20, 0.3)',
              color: '#d4af37',
              padding: '6px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 600,
              marginLeft: '6px',
              height: '36px',
            }}
          >
            <Radio size={14} />
            <span>Radio</span>
          </button>

          <nav className={styles.nav} aria-label="Main navigation">
          {NAV_LINKS.map(({ href, label }) => {
            const pathOnly = href.split('#')[0] || '/';
            const isActive = pathOnly === '/'
              ? pathname === '/' && href.includes('#')
              : pathname.startsWith(pathOnly);
            return (
              <Link
                key={href}
                href={href}
                className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {label}
              </Link>
            );
          })}

          {user ? (
            <div className={styles.userInfo}>
              <span className={styles.userName}>
                {user.user_metadata?.name || user.email?.split('@')[0]}
              </span>
              <button onClick={handleSignOut} className={styles.signOutBtn} title="Sign Out">
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <Link href="/login" className={styles.authBtn} title="Sign In">
              <LogIn size={14} />
              <span>Sign In</span>
            </Link>
          )}

          <span className={styles.badge}>Free</span>
        </nav>
      </div>
    </header>
    <QuickJumpModal isOpen={isJumpOpen} onClose={() => setIsJumpOpen(false)} />
  </>
  );
}
