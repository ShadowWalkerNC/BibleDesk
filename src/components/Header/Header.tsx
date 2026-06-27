import Link from 'next/link';
import styles from './Header.module.css';

export default function Header() {
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
          <Link href="/" className={styles.navLink}>Study</Link>
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
