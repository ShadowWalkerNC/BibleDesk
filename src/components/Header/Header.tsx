'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Header.module.css';

const NAV_LINKS = [
  { href: '/',      label: 'Study' },
  { href: '/graph', label: '🕸️ Graph' },
];

export default function Header() {
  const pathname = usePathname();

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

          <a
            href="https://discord.gg/7c89HKrVe"
            className={styles.navLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            Community
          </a>

          <span className={styles.badge}>Free</span>
        </nav>
      </div>
    </header>
  );
}
