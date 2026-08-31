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
  Download,
  Menu,
  X,
  Layers,
  Globe,
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
  { href: '/prayer',    label: 'Prayer Atlas',  icon: Globe },
  { href: '/sermons',   label: 'Sermons',       icon: Church },
  { href: '/catechism', label: 'Catechism',     icon: MessageSquare },
  { href: '/creeds',    label: 'Creeds',        icon: Scroll },
];

const TOOL_LINKS = [
  { href: '/bookmarks', label: 'Bookmarks',     icon: Bookmark },
  { href: '/history',   label: 'History',       icon: History },
  { href: '/graph',     label: 'Concept Graph', icon: Network },
  { href: '/download',  label: 'Install App',   icon: Download },
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

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

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

      {/* ── Mobile Bottom Navigation Rail ─────────────────────────── */}
      <nav className={styles.mobileNav} aria-label="Mobile navigation">
        <Link
          href="/bible"
          className={`${styles.mobileNavItem} ${isActive('/bible') ? styles.mobileNavItemActive : ''}`}
        >
          <BookOpen size={20} />
          <span>Bible</span>
        </Link>
        <Link
          href="/daily"
          className={`${styles.mobileNavItem} ${isActive('/daily') ? styles.mobileNavItemActive : ''}`}
        >
          <Sun size={20} />
          <span>Daily</span>
        </Link>
        <Link
          href="/prayer"
          className={`${styles.mobileNavItem} ${isActive('/prayer') ? styles.mobileNavItemActive : ''}`}
        >
          <Globe size={20} />
          <span>Prayer</span>
        </Link>
        <Link
          href="/plans"
          className={`${styles.mobileNavItem} ${isActive('/plans') ? styles.mobileNavItemActive : ''}`}
        >
          <Calendar size={20} />
          <span>Plans</span>
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
                className={`${styles.mobileActionBtn} ${hasApiKey ? styles.apiKeyConfigured : ''}`}
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsKeyModalOpen(true);
                }}
              >
                <Sparkles size={16} />
                <span>{hasApiKey ? 'Gemini AI Key: Active' : 'Add Gemini AI Key'}</span>
              </button>

              <button
                className={styles.mobileActionBtn}
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsIntegrationsOpen(true);
                }}
              >
                <Share2 size={16} />
                <span>Discord &amp; WhatsApp Connect</span>
              </button>

              {user ? (
                <div className={styles.mobileUserRow}>
                  <div className={styles.userAvatar}><User size={14} /></div>
                  <span className={styles.userName}>{user.user_metadata?.name || user.email?.split('@')[0]}</span>
                  <button onClick={handleSignOut} className={styles.signOutBtn} title="Sign Out">
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
