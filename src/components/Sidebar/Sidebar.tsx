'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  BookOpen,
  Calendar,
  Sun,
  Brain,
  Church,
  Scroll,
  Bookmark,
  History,
  Network,
  MessageSquare,
  Heart,
  Search,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  User,
  Key,
  Sparkles,
  Share2,
} from 'lucide-react';
import { getBrowserClient } from '@/lib/supabase';
import QuickJumpModal from '@/components/QuickJumpModal/QuickJumpModal';
import ApiKeyModal from '@/components/ApiKeyModal/ApiKeyModal';
import IntegrationsModal from '@/components/IntegrationsModal/IntegrationsModal';
import styles from './Sidebar.module.css';

const STUDY_LINKS = [
  { href: '/bible',     label: 'Study Desk',    icon: BookOpen },
  { href: '/daily',     label: 'Daily Verse',   icon: Sun },
  { href: '/plans',     label: 'Reading Plans', icon: Calendar },
  { href: '/memory',    label: 'Verse Memory',  icon: Brain },
];

const CHURCH_LINKS = [
  { href: '/sermons',   label: 'Sermons',       icon: Church },
  { href: '/prayer',    label: 'Prayer',        icon: Heart },
  { href: '/catechism', label: 'Catechism',     icon: MessageSquare },
  { href: '/creeds',    label: 'Creeds',        icon: Scroll },
];

const TOOL_LINKS = [
  { href: '/bookmarks', label: 'Bookmarks',    icon: Bookmark },
  { href: '/history',   label: 'History',      icon: History },
  { href: '/graph',     label: 'Concept Graph',icon: Network },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isJumpOpen, setIsJumpOpen] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHasApiKey(!!localStorage.getItem('bibledesk_gemini_key'));
    }
  }, [isKeyModalOpen]);

  // Auth state
  useEffect(() => {
    const supabase = getBrowserClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsJumpOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  async function handleSignOut() {
    const supabase = getBrowserClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  function isActive(href: string) {
    return pathname.startsWith(href);
  }

  function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: any }) {
    const active = isActive(href);
    return (
      <Link
        href={href}
        className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
        title={collapsed ? label : undefined}
      >
        <Icon size={18} className={styles.navIcon} />
        {!collapsed && <span className={styles.navLabel}>{label}</span>}
        {active && <span className={styles.activeIndicator} aria-hidden="true" />}
      </Link>
    );
  }

  return (
    <>
      <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}>
        {/* Logo */}
        <div className={styles.logoRow}>
          <Link href="/" className={styles.logo} aria-label="BibleDesk Home">
            <div className={styles.logoIcon} aria-hidden="true">✦</div>
            {!collapsed && (
              <span className={styles.logoText}>
                Bible<span>Desk</span>
              </span>
            )}
          </Link>
          <button
            className={styles.collapseBtn}
            onClick={onToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Quick Jump */}
        <button
          className={styles.quickJump}
          onClick={() => setIsJumpOpen(true)}
          title="Jump to book or chapter (Ctrl+K)"
        >
          <Search size={15} className={styles.navIcon} />
          {!collapsed && (
            <>
              <span className={styles.quickJumpLabel}>Jump to passage…</span>
              <kbd className={styles.quickJumpKbd}>⌘K</kbd>
            </>
          )}
        </button>

        {/* Nav sections */}
        <nav className={styles.nav} aria-label="Main navigation">
          {!collapsed && <p className={styles.sectionLabel}>Study</p>}
          {STUDY_LINKS.map(link => <NavItem key={link.href} {...link} />)}

          {!collapsed && <p className={styles.sectionLabel}>Church</p>}
          {CHURCH_LINKS.map(link => <NavItem key={link.href} {...link} />)}

          {!collapsed && <p className={styles.sectionLabel}>Tools</p>}
          {TOOL_LINKS.map(link => <NavItem key={link.href} {...link} />)}
          
          <button
            className={styles.navItem}
            onClick={() => setIsIntegrationsOpen(true)}
            title={collapsed ? 'Discord & WhatsApp' : undefined}
            style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <Share2 size={18} className={styles.navIcon} />
            {!collapsed && <span className={styles.navLabel}>Integrations</span>}
          </button>
        </nav>

        {/* Footer: Gemini API Key & Auth */}
        <div className={styles.sidebarFooter}>
          <button
            className={`${styles.apiKeyBtn} ${hasApiKey ? styles.apiKeyConfigured : ''}`}
            onClick={() => setIsKeyModalOpen(true)}
            title={hasApiKey ? 'Gemini API Key: Configured' : 'Configure Gemini API Key'}
          >
            <Sparkles size={14} className={styles.keyIcon} />
            {!collapsed && (
              <span className={styles.apiKeyLabel}>
                {hasApiKey ? 'AI Key: Active' : 'Add Gemini Key'}
              </span>
            )}
          </button>

          {user ? (
            <div className={styles.userRow}>
              <div className={styles.userAvatar} aria-hidden="true">
                <User size={14} />
              </div>
              {!collapsed && (
                <span className={styles.userName}>
                  {user.user_metadata?.name || user.email?.split('@')[0]}
                </span>
              )}
              <button
                onClick={handleSignOut}
                className={styles.signOutBtn}
                title="Sign Out"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <Link href="/login" className={styles.signInBtn} title="Sign In">
              <LogIn size={15} />
              {!collapsed && <span>Sign In</span>}
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile bottom nav — visible when collapsed on small screens */}
      <nav className={styles.mobileNav} aria-label="Mobile navigation">
        {[...STUDY_LINKS.slice(0, 2), ...CHURCH_LINKS.slice(0, 1), TOOL_LINKS[0]].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`${styles.mobileNavItem} ${isActive(href) ? styles.mobileNavItemActive : ''}`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        ))}
        <button className={styles.mobileNavItem} onClick={() => setIsIntegrationsOpen(true)}>
          <Share2 size={20} />
          <span>Connect</span>
        </button>
      </nav>

      <QuickJumpModal isOpen={isJumpOpen} onClose={() => setIsJumpOpen(false)} />
      <ApiKeyModal isOpen={isKeyModalOpen} onClose={() => setIsKeyModalOpen(false)} />
      <IntegrationsModal isOpen={isIntegrationsOpen} onClose={() => setIsIntegrationsOpen(false)} />
    </>
  );
}
