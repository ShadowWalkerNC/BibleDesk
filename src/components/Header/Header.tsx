'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Search, LogIn, LogOut } from 'lucide-react';
import { getBrowserClient, isSupabaseConfigured } from '@/lib/supabase';
import QuickJumpModal from '@/components/QuickJumpModal/QuickJumpModal';
import styles from './Header.module.css';

const NAV_LINKS = [
  { href: '/bible',       label: 'Study Desk' },
  { href: '/study-resources', label: 'Resources' },
  { href: '/#assistant',  label: '5D Assistant' },
  { href: '/prayer',      label: 'Prayer' },
  { href: '/developers',  label: 'Developers' },
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
    function checkUser() {
      const supabase = getBrowserClient();
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user);
        } else if (!isSupabaseConfigured() && typeof window !== 'undefined') {
          const local = localStorage.getItem('bibledesk_local_user');
          if (local) {
            try {
              setUser(JSON.parse(local));
            } catch {
              setUser(null);
            }
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      });
    }

    checkUser();
    const supabase = getBrowserClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else if (!isSupabaseConfigured() && typeof window !== 'undefined') {
        const local = localStorage.getItem('bibledesk_local_user');
        if (local) {
          try {
            setUser(JSON.parse(local));
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    });

    const handleStorage = () => checkUser();
    window.addEventListener('storage', handleStorage);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  async function handleSignOut() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bibledesk_local_user');
      window.dispatchEvent(new Event('storage'));
    }
    const supabase = getBrowserClient();
    await supabase.auth.signOut();
    setUser(null);
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
                {!isSupabaseConfigured() ? 'Local study profile' : (user.user_metadata?.name || user.email?.split('@')[0])}
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
