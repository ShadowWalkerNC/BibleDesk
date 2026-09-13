import Link from 'next/link';
import {
  BookOpen,
  Globe,
  Monitor,
  Smartphone,
  Terminal,
  ExternalLink,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader/PageHeader';
import styles from './page.module.css';

export default function DownloadPage() {
  return (
    <main className={styles.main}>
      <div className="container">
        <PageHeader
          icon={BookOpen}
          title="Install BibleDesk"
          subtitle="Honest install docs: use the web app as a PWA, or build the desktop and Android clients from source yourself."
        />

        <p className={styles.disclaimer}>
          We do not publish hosted installers, APK downloads, or app-store listings.
          The only builds available are the ones you create yourself from the
          open-source repository.
        </p>

        {/* 1. Install as PWA */}
        <section className={`${styles.card} glass-card`}>
          <div className={styles.sectionHeader}>
            <Globe size={22} className={styles.sectionIcon} />
            <div>
              <h2 className={styles.sectionTitle}>Install as a PWA</h2>
              <span className={styles.sectionTag}>Recommended — no downloads needed</span>
            </div>
          </div>
          <p className={styles.sectionDesc}>
            BibleDesk is a web app you install straight from your browser:
          </p>
          <ol className={styles.steps}>
            <li>
              <strong>Chrome / Edge (desktop or Android):</strong> open your browser
              menu and tap &ldquo;Add to Home Screen&rdquo; or &ldquo;Install
              BibleDesk&rdquo;. On desktop, an install icon also appears in the
              address bar.
            </li>
            <li>
              <strong>Safari (iPhone / iPad):</strong> tap the Share button (square
              with an arrow pointing up), scroll down, and tap &ldquo;Add to Home
              Screen&rdquo;.
            </li>
            <li>
              <strong>Firefox:</strong> open the browser menu and choose
              &ldquo;Install&rdquo; (or use your OS&rsquo;s &ldquo;Add to Home
              Screen&rdquo; option on mobile).
            </li>
          </ol>
          <Link href="/bible" className={styles.outlineLink}>
            <span>Open the web reader first</span>
            <BookOpen size={13} />
          </Link>
        </section>

        {/* 2. Build desktop from source */}
        <section className={`${styles.card} glass-card`}>
          <div className={styles.sectionHeader}>
            <Monitor size={22} className={styles.sectionIcon} />
            <div>
              <h2 className={styles.sectionTitle}>Build Desktop from Source</h2>
              <span className={styles.devTag}>For developers</span>
            </div>
          </div>
          <p className={styles.sectionDesc}>
            The desktop client is an Electron shell in{' '}
            <code>archive/desktop</code>. To package an installer for your OS, run:
          </p>
          <pre className={styles.codeBlock}>
            <code>cd archive/desktop && npm run dist</code>
          </pre>
          <p className={styles.hint}>
            <Terminal size={12} /> Requires Node.js and the repository cloned
            locally.
          </p>
        </section>

        {/* 3. Build Android from source */}
        <section className={`${styles.card} glass-card`}>
          <div className={styles.sectionHeader}>
            <Smartphone size={22} className={styles.sectionIcon} />
            <div>
              <h2 className={styles.sectionTitle}>Build Android from Source</h2>
              <span className={styles.devTag}>
                For developers — not an official release
              </span>
            </div>
          </div>
          <p className={styles.sectionDesc}>
            The Android client is a Capacitor project in{' '}
            <code>archive/android</code>. To build it locally, run:
          </p>
          <pre className={styles.codeBlock}>
            <code>cd archive/android && npx cap build android</code>
          </pre>
          <p className={styles.hint}>
            This is an experimental, developer-built APK — no signed or official
            release is published. For everyday mobile use, the PWA above is the
            recommended install.
          </p>
        </section>

        <Link
          href="https://github.com/ShadowWalkerNC/BibleDesk#readme"
          className={styles.outlineLink}
        >
          <span>Full setup details in the repo README</span>
          <ExternalLink size={12} />
        </Link>
      </div>
    </main>
  );
}
