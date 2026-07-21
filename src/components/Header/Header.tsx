'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getBrowserClient } from '@/lib/supabase';
import styles from './Header.module.css';

const NAV_LINKS = [
  { href: '/',            label: 'Study' },
  { href: '/bible',       label: 'Bible Reader' },
  { href: '/daily',       label: 'Daily Verse' },
  { href: '/plans',       label: 'Plans' },
  { href: '/catechism',   label: 'Catechism' },
  { href: '/creeds',      label: 'Creeds' },
  { href: '/memory',      label: 'Memory' },
  { href: '/prayer',      label: 'Prayers' },
  { href: '/sermons',     label: 'Sermon Prep' },
  { href: '/graph',       label: 'Graph' },
  { href: '/history',     label: 'History' },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

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
    <header className={styles.header} role="banner">
      <div className={styles.inner}>
        <Link href="/" className={styles.logo} aria-label="BibleDesk Home">
          <div className={styles.logoIcon} aria-hidden="true">✦</div>
          <span className={styles.logoText}>
            Bible<span>Desk</span>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Main navigation">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = href === '/'
              ? pathname === '/'
              : pathname.startsWith(href);
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
              <button onClick={handleSignOut} className={styles.signOutBtn}>
                Sign Out
              </button>
            </div>
          ) : (
            <Link href="/login" className={styles.authBtn}>
              Sign In
            </Link>
          )}

          <span className={styles.badge}>Free</span>
        </nav>
      </div>
    </header>
  );
}
