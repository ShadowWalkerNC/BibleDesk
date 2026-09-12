'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  BookOpen,
  Church,
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
  Download,
  Menu,
  X,
  Layers,
  Globe,
  Code,
  ShieldCheck,
} from 'lucide-react';
import { getBrowserClient } from '@/lib/supabase';
import QuickJumpModal from '@/components/QuickJumpModal/QuickJumpModal';
import ApiKeyModal from '@/components/ApiKeyModal/ApiKeyModal';
import IntegrationsModal from '@/components/IntegrationsModal/IntegrationsModal';
import styles from './Sidebar.module.css';

const STUDY_LINKS = [
  { href: '/bible',            label: 'Study Desk',     icon: BookOpen },
  { href: '/study-resources',  label: 'Study Resources', icon: Layers },
];

const CHURCH_LINKS = [
  { href: '/prayer',    label: 'Prayer Atlas',  icon: Globe },
];

const TOOL_LINKS = [
  { href: '/developers',label: 'Developers & SDK', icon: Code },
  { href: '/download',  label: 'Install App',   icon: Download },
];

// C01: /mod has no usable client-side role check (src/lib/mod-auth.ts is
// server-only), so the link is rendered for everyone and the /mod page itself
// gates: non-moderators see "Access Denied". Do not rely on this link for
// authorization — the /api/mod/* routes enforce it server-side.
const MOD_LINKS = [
  { href: '/mod', label: 'Moderation', icon: ShieldCheck },
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHasApiKey(!!localStorage.getItem('bibledesk_gemini_key'));
    }
  }, [isKeyModalOpen]);

  // Auth state
  useEffect(() => {
    function checkUser() {
      const supabase = getBrowserClient();
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user);
        } else if (typeof window !== 'undefined') {
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setUser(session.user);
      } else if (typeof window !== 'undefined') {
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

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

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

  function isActive(href: string) {
    return pathname.startsWith(href);
  }

  function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: any }) {
    const active = isActive(href);
    return (
      <Link
        href={href}
        className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
        aria-current={active ? 'page' : undefined}
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
      {/* ── Desktop Sidebar ────────────────────────────────────────── */}
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
          aria-label="Jump to book or chapter (Ctrl+K)"
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

          {!collapsed && <p className={styles.sectionLabel}>Moderation</p>}
          {MOD_LINKS.map(link => <NavItem key={link.href} {...link} />)}
          
          <button
            className={styles.navItem}
            onClick={() => setIsIntegrationsOpen(true)}
            title={collapsed ? 'WhatsApp' : undefined}
            style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <Share2 size={18} className={styles.navIcon} />
            {!collapsed && <span className={styles.navLabel}>WhatsApp Sharing</span>}
          </button>
        </nav>

        {/* Footer: Gemini API Key & Auth */}
        <div className={styles.sidebarFooter}>
          <button
            className={`${styles.apiKeyBtn} ${(user || hasApiKey) ? styles.apiKeyConfigured : ''}`}
            onClick={() => setIsKeyModalOpen(true)}
            title={user ? 'Gemini AI: Active (Included with your account)' : hasApiKey ? 'Gemini API Key: Configured' : 'Configure Gemini API Key / Sign In'}
          >
            <Sparkles size={14} className={styles.keyIcon} />
            {!collapsed && (
              <span className={styles.apiKeyLabel}>
                {user ? 'Gemini AI: Included' : hasApiKey ? 'AI Key: Active' : 'Sign in for AI'}
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
                aria-label="Sign Out"
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

      {/* ── Mobile Bottom Navigation Rail ─────────────────────────── */}
      <nav className={styles.mobileNav} aria-label="Mobile navigation">
        <Link
          href="/bible"
          className={`${styles.mobileNavItem} ${isActive('/bible') ? styles.mobileNavItemActive : ''}`}
          aria-current={isActive('/bible') ? 'page' : undefined}
        >
          <BookOpen size={20} />
          <span>Bible</span>
        </Link>
        <Link
          href="/study-resources"
          className={`${styles.mobileNavItem} ${isActive('/study-resources') ? styles.mobileNavItemActive : ''}`}
          aria-current={isActive('/study-resources') ? 'page' : undefined}
        >
          <Layers size={20} />
          <span>Resources</span>
        </Link>
        <Link
          href="/prayer"
          className={`${styles.mobileNavItem} ${isActive('/prayer') ? styles.mobileNavItemActive : ''}`}
          aria-current={isActive('/prayer') ? 'page' : undefined}
        >
          <Globe size={20} />
          <span>Prayer</span>
        </Link>
        <button
          className={`${styles.mobileNavItem} ${isMobileMenuOpen ? styles.mobileNavItemActive : ''}`}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="All Tools and Pages"
        >
          <Menu size={20} />
          <span>All Pages</span>
        </button>
      </nav>

      {/* ── Full Mobile Menu Sheet / Drawer (Shows ALL pages) ─────── */}
      {isMobileMenuOpen && (
        <div className={styles.mobileDrawerOverlay} onClick={() => setIsMobileMenuOpen(false)}>
          <div className={styles.mobileDrawerContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.mobileDrawerHandleBar}>
              <div className={styles.mobileDrawerHandle} />
            </div>
            <div className={styles.mobileDrawerHeader}>
              <div className={styles.mobileDrawerBrand}>
                <div className={styles.logoIcon}>✦</div>
                <span className={styles.logoText}>Bible<span>Desk</span></span>
              </div>
              <button
                className={styles.mobileDrawerCloseBtn}
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick Jump Bar */}
            <button
              className={styles.mobileQuickJumpBtn}
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsJumpOpen(true);
              }}
            >
              <Search size={16} />
              <span>Jump to book, chapter, or verse...</span>
            </button>

            {/* Categorized Full Links */}
            <div className={styles.mobileDrawerLinks}>
              <div className={styles.mobileCategory}>
                <span className={styles.mobileCategoryTitle}>Scripture &amp; Study</span>
                <div className={styles.mobileCategoryGrid}>
                  {STUDY_LINKS.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className={`${styles.mobileCategoryCard} ${isActive(href) ? styles.mobileCategoryCardActive : ''}`}
                      aria-current={isActive(href) ? 'page' : undefined}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Icon size={18} className={styles.mobileCategoryIcon} />
                      <span>{label}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className={styles.mobileCategory}>
                <span className={styles.mobileCategoryTitle}>Church &amp; Community</span>
                <div className={styles.mobileCategoryGrid}>
                  {CHURCH_LINKS.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className={`${styles.mobileCategoryCard} ${isActive(href) ? styles.mobileCategoryCardActive : ''}`}
                      aria-current={isActive(href) ? 'page' : undefined}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Icon size={18} className={styles.mobileCategoryIcon} />
                      <span>{label}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className={styles.mobileCategory}>
                <span className={styles.mobileCategoryTitle}>Tools &amp; Knowledge</span>
                <div className={styles.mobileCategoryGrid}>
                  {TOOL_LINKS.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className={`${styles.mobileCategoryCard} ${isActive(href) ? styles.mobileCategoryCardActive : ''}`}
                      aria-current={isActive(href) ? 'page' : undefined}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Icon size={18} className={styles.mobileCategoryIcon} />
                      <span>{label}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className={styles.mobileCategory}>
                <span className={styles.mobileCategoryTitle}>Moderation</span>
                <div className={styles.mobileCategoryGrid}>
                  {MOD_LINKS.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className={`${styles.mobileCategoryCard} ${isActive(href) ? styles.mobileCategoryCardActive : ''}`}
                      aria-current={isActive(href) ? 'page' : undefined}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Icon size={18} className={styles.mobileCategoryIcon} />
                      <span>{label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile Footer Actions (API Key, Integrations, Auth) */}
            <div className={styles.mobileDrawerFooter}>
              <button
                className={`${styles.mobileActionBtn} ${(user || hasApiKey) ? styles.apiKeyConfigured : ''}`}
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsKeyModalOpen(true);
                }}
              >
                <Sparkles size={16} />
                <span>{user ? 'Gemini AI: Included' : hasApiKey ? 'AI Key: Active' : 'Sign in for AI Assistant'}</span>
              </button>

              <button
                className={styles.mobileActionBtn}
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsIntegrationsOpen(true);
                }}
              >
                <Share2 size={16} />
                <span>WhatsApp Connect</span>
              </button>

              {user ? (
                <div className={styles.mobileUserRow}>
                  <div className={styles.userAvatar}><User size={14} /></div>
                  <span className={styles.userName}>{user.user_metadata?.name || user.email?.split('@')[0]}</span>
                  <button onClick={handleSignOut} className={styles.signOutBtn} aria-label="Sign Out" title="Sign Out">
                    <LogOut size={14} />
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className={styles.mobileSignInBtn}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <LogIn size={16} />
                  <span>Sign In</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <QuickJumpModal isOpen={isJumpOpen} onClose={() => setIsJumpOpen(false)} />
      <ApiKeyModal isOpen={isKeyModalOpen} onClose={() => setIsKeyModalOpen(false)} />
      <IntegrationsModal isOpen={isIntegrationsOpen} onClose={() => setIsIntegrationsOpen(false)} />
    </>
  );
}
