// BibleDesk — /share/[slug] not found page

import Link from 'next/link';
import Header from '@/components/Header/Header';
import styles from './SharePage.module.css';

export default function ShareNotFound() {
  return (
    <>
      <Header />
      <main className={styles.page}>
        <div className={`container ${styles.inner}`}>
          <div style={{ textAlign: 'center', paddingTop: '4rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✦</div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              Study not found
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem' }}>
              This shared answer may have been removed or the link may be incorrect.
            </p>
            <Link href="/" className={styles.ctaBtn}>
              Ask BibleDesk →
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
