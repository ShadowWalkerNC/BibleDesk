'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Download, 
  Monitor, 
  Smartphone, 
  Globe, 
  Layers, 
  Check, 
  ExternalLink, 
  Sparkles, 
  BookOpen, 
  ShieldCheck, 
  HardDrive, 
  Terminal,
  QrCode,
  ArrowRight
} from 'lucide-react';
import PageHeader from '@/components/PageHeader/PageHeader';
import styles from './page.module.css';

export default function DownloadPage() {
  const [userOS, setUserOS] = useState<'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'unknown'>('unknown');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    // Detect OS
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent.toLowerCase();
      if (ua.includes('win')) setUserOS('windows');
      else if (ua.includes('mac') && !ua.includes('iphone') && !ua.includes('ipad')) setUserOS('macos');
      else if (ua.includes('android')) setUserOS('android');
      else if (ua.includes('iphone') || ua.includes('ipad')) setUserOS('ios');
      else if (ua.includes('linux')) setUserOS('linux');

      // PWA install event listener
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
      });

      window.addEventListener('appinstalled', () => {
        setIsInstalled(true);
        setDeferredPrompt(null);
      });
    }
  }, []);

  async function handleInstallPWA() {
    if (!deferredPrompt) {
      alert('To install on your device, open your browser menu and tap "Add to Home Screen" or "Install BibleDesk".');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  }

  return (
    <main className={styles.main}>
      <div className="container">
        <PageHeader
          icon={Download}
          title="Download BibleDesk"
          subtitle="One unified Bible study suite available across Web, Desktop, Android, and Browser Side Panels."
        />

        {/* Highlight Banner */}
        <div className={styles.heroBanner}>
          <div className={styles.heroContent}>
            <span className={styles.detectedTag}>
              Detected System: <strong>{userOS.toUpperCase()}</strong>
            </span>
            <h2 className={styles.heroTitle}>Install for your daily study workflow</h2>
            <p className={styles.heroDesc}>
              Read 6 public-domain translations (KJV, ASV, WEB, BBE, Darby, YLT), search concordance terms, and inspect Strong's Greek/Hebrew definitions 100% offline.
            </p>
            <div className={styles.heroActionRow}>
              {userOS === 'android' ? (
                <a href="#android" className={styles.primaryHeroBtn}>
                  <Smartphone size={18} />
                  <span>Download Android APK</span>
                </a>
              ) : userOS === 'windows' || userOS === 'macos' || userOS === 'linux' ? (
                <a href="#desktop" className={styles.primaryHeroBtn}>
                  <Monitor size={18} />
                  <span>Download Desktop App</span>
                </a>
              ) : (
                <button onClick={handleInstallPWA} className={styles.primaryHeroBtn}>
                  <Globe size={18} />
                  <span>Install Web App (PWA)</span>
                </button>
              )}
              <Link href="/bible" className={styles.secondaryHeroBtn}>
                <BookOpen size={16} />
                <span>Open in Web Browser →</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Platform Grid */}
        <div className={styles.platformGrid}>
          {/* 1. Web & PWA */}
          <div className={`${styles.platformCard} glass-card`}>
            <div className={styles.cardHeaderRow}>
              <div className={styles.platformIconWrap}>
                <Globe size={22} className={styles.platformIcon} />
              </div>
              <div>
                <h3 className={styles.platformName}>Web App &amp; PWA</h3>
                <span className={styles.platformType}>Zero install • Cross-Device</span>
              </div>
            </div>
            <p className={styles.platformDesc}>
              Instant access on any desktop or mobile browser. Install as a Progressive Web App for offline caching and home screen launch.
            </p>
            <ul className={styles.featureList}>
              <li><Check size={14} className={styles.checkIcon} /> Works on all modern browsers (Chrome, Safari, Firefox, Edge)</li>
              <li><Check size={14} className={styles.checkIcon} /> Offline cached reader &amp; concordance</li>
              <li><Check size={14} className={styles.checkIcon} /> Instant synchronization with Supabase cloud</li>
            </ul>
            <div className={styles.cardFooter}>
              <button
                onClick={handleInstallPWA}
                className={styles.downloadBtn}
                title="Install PWA to Device"
              >
                <Download size={15} />
                <span>{isInstalled ? 'Installed' : 'Install PWA to Device'}</span>
              </button>
              <Link href="/bible" className={styles.outlineLink}>
                <span>Launch Web Reader</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {/* 2. Desktop App */}
          <div id="desktop" className={`${styles.platformCard} glass-card`}>
            <div className={styles.cardHeaderRow}>
              <div className={styles.platformIconWrap}>
                <Monitor size={22} className={styles.platformIcon} />
              </div>
              <div>
                <h3 className={styles.platformName}>Desktop App</h3>
                <span className={styles.platformType}>Windows • macOS • Linux</span>
              </div>
            </div>
            <p className={styles.platformDesc}>
              Native Electron shell with offline SQLite storage, Obsidian markdown vault synchronization, and local graphify knowledge trees.
            </p>
            <ul className={styles.featureList}>
              <li><Check size={14} className={styles.checkIcon} /> Windows installer (<code>.exe</code>) &amp; Portable</li>
              <li><Check size={14} className={styles.checkIcon} /> macOS Apple Silicon &amp; Intel (<code>.dmg</code>)</li>
              <li><Check size={14} className={styles.checkIcon} /> Linux AppImage (<code>.AppImage</code>) &amp; <code>.deb</code></li>
            </ul>
            <div className={styles.desktopDownloadRow}>
              <button
                className={styles.downloadBtn}
                onClick={() => alert('To package for your OS, run:\n\ncd apps/desktop && npm run dist')}
              >
                <Download size={15} />
                <span>Download Desktop Installer</span>
              </button>
            </div>
            <div className={styles.cliHint}>
              <Terminal size={12} />
              <span>Or build from source: <code>npm run desktop:dist</code></span>
            </div>
          </div>

          {/* 3. Android App */}
          <div id="android" className={`${styles.platformCard} glass-card`}>
            <div className={styles.cardHeaderRow}>
              <div className={styles.platformIconWrap}>
                <Smartphone size={22} className={styles.platformIcon} />
              </div>
              <div>
                <h3 className={styles.platformName}>Android App</h3>
                <span className={styles.platformType}>Phones • Tablets • Foldables</span>
              </div>
            </div>
            <p className={styles.platformDesc}>
              Native Capacitor Android build with fluid touch scrolling, Strong's lexicon lookup, dark parchment reading mode, and offline Scripture search.
            </p>
            <ul className={styles.featureList}>
              <li><Check size={14} className={styles.checkIcon} /> Direct APK Sideload (<code>BibleDesk.apk</code>)</li>
              <li><Check size={14} className={styles.checkIcon} /> 100% Offline Bible text &amp; lexicon definitions</li>
              <li><Check size={14} className={styles.checkIcon} /> WhatsApp &amp; Discord 1-click sharing</li>
            </ul>
            <div className={styles.cardFooter}>
              <button
                className={styles.downloadBtn}
                onClick={() => alert('Android APK package available in apps/android. Run:\n\ncd apps/android && npx cap build android')}
              >
                <Download size={15} />
                <span>Download Android APK</span>
              </button>
              <button
                className={styles.qrToggleBtn}
                onClick={() => setShowQR(!showQR)}
                title="Show Mobile QR Code"
              >
                <QrCode size={16} />
              </button>
            </div>
            {showQR && (
              <div className={styles.qrBox}>
                <p>Scan with your Android phone to open BibleDesk instantly:</p>
                <code className={styles.qrUrl}>{typeof window !== 'undefined' ? window.location.origin : 'https://bibledesk.org'}</code>
              </div>
            )}
          </div>

          {/* 4. Chrome Extension */}
          <div className={`${styles.platformCard} glass-card`}>
            <div className={styles.cardHeaderRow}>
              <div className={styles.platformIconWrap}>
                <Layers size={22} className={styles.platformIcon} />
              </div>
              <div>
                <h3 className={styles.platformName}>Chrome Side Panel</h3>
                <span className={styles.platformType}>Manifest V3 Extension</span>
              </div>
            </div>
            <p className={styles.platformDesc}>
              Read Scripture, query Strong's Greek/Hebrew dictionaries, and review 5D study insights directly in Chrome's native Side Panel while browsing.
            </p>
            <ul className={styles.featureList}>
              <li><Check size={14} className={styles.checkIcon} /> Context menu: Right click text → "Study in BibleDesk"</li>
              <li><Check size={14} className={styles.checkIcon} /> Instant Strong's lookup (e.g. <code>G2889</code>, <code>H7225</code>)</li>
              <li><Check size={14} className={styles.checkIcon} /> Works in Chrome, Brave, Edge, and Arc</li>
            </ul>
            <div className={styles.cardFooter}>
              <button
                className={styles.downloadBtn}
                onClick={() => alert('To load the extension:\n1. Open chrome://extensions\n2. Enable Developer mode\n3. Click "Load unpacked" and choose the apps/extension folder.')}
              >
                <Download size={15} />
                <span>Load Extension (Unpacked)</span>
              </button>
              <Link href="/apps/extension/README.md" className={styles.outlineLink}>
                <span>Setup Guide</span>
                <ExternalLink size={12} />
              </Link>
            </div>
          </div>
        </div>

        {/* Multi-Platform Guarantee */}
        <div className={styles.guaranteeCard}>
          <ShieldCheck size={28} className={styles.guaranteeIcon} />
          <div>
            <h4 className={styles.guaranteeTitle}>Shared Offline Scripture Foundation</h4>
            <p className={styles.guaranteeText}>
              Every platform package includes the complete public-domain Bible corpus (KJV, ASV, WEB, BBE, Darby, YLT) and OpenScriptures Strong's Greek &amp; Hebrew lexicons locally. No subscriptions, no ads, and no internet required for core Bible study.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
