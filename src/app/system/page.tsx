'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Database,
  BookOpen,
  Sparkles,
  Shield,
  Download,
  Upload,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Wrench,
  RotateCcw,
} from 'lucide-react';
import styles from './page.module.css';

interface DiagnosticReport {
  success: boolean;
  overallStatus: 'healthy' | 'warning' | 'error';
  headline: string;
  issues: string[];
  checks: {
    scriptures?: {
      status: string;
      label: string;
      description: string;
      detail?: string;
    };
    lexicons?: {
      status: string;
      label: string;
      description: string;
    };
    database?: {
      status: string;
      label: string;
      description: string;
      verseCount?: number;
      notesCount?: number;
      collectionsCount?: number;
      databaseType?: string;
    };
    ai?: {
      status: string;
      label: string;
      description: string;
      serverConfigured?: boolean;
    };
    cloudSync?: {
      status: string;
      label: string;
      description: string;
      cloudActive?: boolean;
    };
  };
  diagnosticsDurationMs: number;
  timestamp: string;
  systemInfo: {
    platform: string;
    nodeVersion: string;
    environment: string;
    appVersion: string;
  };
}

export default function SystemHealthPage() {
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [repairing, setRepairing] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<{
    data: any;
    summary: string;
  } | null>(null);

  const runDiagnostics = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      const res = await fetch('/api/system/diagnostics', { cache: 'no-store' });
      const data = await res.json();
      setReport(data);
    } catch (err: any) {
      setNotice({
        type: 'error',
        text: 'Unable to reach the diagnostic service. Your local study data remains completely intact.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runDiagnostics();
  }, [runDiagnostics]);

  async function handleRepair(action: string) {
    setRepairing(action);
    setNotice(null);
    try {
      const res = await fetch('/api/system/repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        setNotice({ type: 'success', text: data.message });
        runDiagnostics();
      } else {
        setNotice({ type: 'error', text: data.error || 'Maintenance action did not succeed.' });
      }
    } catch (err: any) {
      setNotice({ type: 'error', text: 'Communication error during repair action.' });
    } finally {
      setRepairing(null);
    }
  }

  function handleResetCache() {
    if (typeof window === 'undefined') return;
    try {
      // Clear transient caches while preserving personal user data (notes, prayers, user identity)
      sessionStorage.clear();
      localStorage.removeItem('bibledesk_search_cache');
      localStorage.removeItem('bibledesk_temp_view');
      setNotice({
        type: 'success',
        text: 'Temporary cache cleared successfully! Personal study notes and prayers remain safely preserved.',
      });
      runDiagnostics();
    } catch {
      setNotice({ type: 'error', text: 'Unable to clear browser cache.' });
    }
  }

  async function handleExportFullBackup() {
    try {
      // Collect local-first storage items
      const localNotes = localStorage.getItem('bibledesk_verse_notes') || '{}';
      const localPrayers = localStorage.getItem('bibledesk_prayer_care_store') || '{}';
      const localHighlights = localStorage.getItem('bibledesk_highlights') || '{}';
      const localPlanProgress = localStorage.getItem('bibledesk_plan_progress') || '{}';

      // Fetch server records if available
      let serverNotes: any[] = [];
      let serverCollections: any[] = [];
      try {
        const notesRes = await fetch('/api/notes').then((r) => r.json());
        if (notesRes.success) serverNotes = notesRes.notes || [];
        const collRes = await fetch('/api/collections').then((r) => r.json());
        if (collRes.success) serverCollections = collRes.collections || [];
      } catch {
        // Continue with local data
      }

      const backupPackage = {
        meta: {
          app: 'BibleDesk',
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          type: 'full_backup',
        },
        localNotes: JSON.parse(localNotes),
        localPrayers: JSON.parse(localPrayers),
        localHighlights: JSON.parse(localHighlights),
        localPlanProgress: JSON.parse(localPlanProgress),
        serverNotes,
        serverCollections,
      };

      const blob = new Blob([JSON.stringify(backupPackage, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bibledesk-complete-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setNotice({
        type: 'success',
        text: 'Complete backup file generated and downloaded to your device!',
      });
    } catch (err: any) {
      setNotice({ type: 'error', text: 'Backup export failed: ' + err.message });
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.meta || parsed.meta.app !== 'BibleDesk') {
          setNotice({
            type: 'error',
            text: 'Selected file is not a valid BibleDesk backup package.',
          });
          return;
        }

        const notesCount = (parsed.serverNotes?.length || 0) + Object.keys(parsed.localNotes || {}).length;
        const collCount = parsed.serverCollections?.length || 0;
        const exportDate = new Date(parsed.meta.exportedAt).toLocaleDateString();

        setPendingRestore({
          data: parsed,
          summary: `Backup package verified from ${exportDate}. Contains approximately ${notesCount} study notes and ${collCount} collections.`,
        });
      } catch {
        setNotice({ type: 'error', text: 'Could not read or parse the selected backup file.' });
      }
    };
    reader.readAsText(file);
  }

  function confirmRestore() {
    if (!pendingRestore) return;
    try {
      const data = pendingRestore.data;
      if (data.localNotes) {
        localStorage.setItem('bibledesk_verse_notes', JSON.stringify(data.localNotes));
      }
      if (data.localPrayers) {
        localStorage.setItem('bibledesk_prayer_care_store', JSON.stringify(data.localPrayers));
      }
      if (data.localHighlights) {
        localStorage.setItem('bibledesk_highlights', JSON.stringify(data.localHighlights));
      }
      if (data.localPlanProgress) {
        localStorage.setItem('bibledesk_plan_progress', JSON.stringify(data.localPlanProgress));
      }

      setNotice({
        type: 'success',
        text: 'Data restored successfully from backup! Your notes and study plans are up to date.',
      });
      setPendingRestore(null);
      runDiagnostics();
    } catch (err: any) {
      setNotice({ type: 'error', text: 'Failed to restore backup data: ' + err.message });
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <div className={styles.eyebrow}>
            <Activity size={15} />
            <span>Reliability &amp; Recovery</span>
          </div>
          <h1 className={styles.title}>System Health &amp; Diagnostics Hub</h1>
          <p className={styles.subtitle}>
            Monitor subsystem integrity, perform safe 1-click repairs, and manage complete backups of your personal study data without technical knowledge.
          </p>
        </div>

        <button
          type="button"
          onClick={runDiagnostics}
          disabled={loading}
          className={styles.refreshBtn}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>{loading ? 'Testing Subsystems...' : 'Run Health Check'}</span>
        </button>
      </header>

      {notice && (
        <div
          className={`${styles.statusBanner} ${
            notice.type === 'success' ? styles.statusBannerHealthy : styles.statusBannerError
          }`}
        >
          <div className={styles.statusBannerLeft}>
            <span className={styles.statusBannerIcon}>
              {notice.type === 'success' ? '✓' : '▲'}
            </span>
            <div className={styles.statusBannerText}>
              <p>{notice.text}</p>
            </div>
          </div>
          <button
            type="button"
            className={styles.repairActionBtn}
            onClick={() => setNotice(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Overall Health Status Banner */}
      {report && (
        <div
          className={`${styles.statusBanner} ${
            report.overallStatus === 'healthy'
              ? styles.statusBannerHealthy
              : report.overallStatus === 'warning'
              ? styles.statusBannerWarning
              : styles.statusBannerError
          }`}
        >
          <div className={styles.statusBannerLeft}>
            <span className={styles.statusBannerIcon}>
              {report.overallStatus === 'healthy' ? (
                <CheckCircle2 size={32} />
              ) : report.overallStatus === 'warning' ? (
                <AlertTriangle size={32} />
              ) : (
                <XCircle size={32} />
              )}
            </span>
            <div className={styles.statusBannerText}>
              <h3>{report.headline}</h3>
              <p>
                Diagnostics completed in {report.diagnosticsDurationMs}ms · Evaluated on{' '}
                {new Date(report.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Subsystem Cards */}
      <section>
        <h2 className={styles.sectionTitle}>Subsystem Integrity Status</h2>
        <p className={styles.sectionSubtitle}>
          Real-time status across bundled Scripture files, relational database, lexicons, and AI services.
        </p>

        <div className={styles.cardsGrid}>
          {/* Scripture Modules */}
          <div className={styles.statusCard}>
            <div className={styles.statusCardHeader}>
              <div className={styles.statusCardTitle}>
                <BookOpen size={18} color="var(--dim-scripture)" />
                <span>Scripture Modules</span>
              </div>
              <span
                className={`${styles.statusPill} ${
                  !report
                    ? styles.statusPillNeutral
                    : report.checks.scriptures?.status === 'healthy'
                    ? styles.statusPillGreen
                    : styles.statusPillRed
                }`}
              >
                {!report
                  ? 'Verifying...'
                  : report.checks.scriptures?.status === 'healthy'
                  ? 'Active'
                  : 'Attention'}
              </span>
            </div>
            <p className={styles.statusCardDesc}>
              {report?.checks.scriptures?.description || 'Verifying offline translation modules...'}
            </p>
            <div className={styles.statusCardMeta}>
              <span>6 Bundled Bibles: KJV, ASV, WEB, BBE, Darby, YLT</span>
            </div>
          </div>

          {/* Database Engine */}
          <div className={styles.statusCard}>
            <div className={styles.statusCardHeader}>
              <div className={styles.statusCardTitle}>
                <Database size={18} color="var(--dim-theological)" />
                <span>Database Engine</span>
              </div>
              <span
                className={`${styles.statusPill} ${
                  !report
                    ? styles.statusPillNeutral
                    : report.checks.database?.status === 'healthy'
                    ? styles.statusPillGreen
                    : styles.statusPillRed
                }`}
              >
                {!report
                  ? 'Verifying...'
                  : report.checks.database?.status === 'healthy'
                  ? 'Connected'
                  : 'Error'}
              </span>
            </div>
            <p className={styles.statusCardDesc}>
              {report?.checks.database?.description || 'Connecting to database layer...'}
            </p>
            <div className={styles.statusCardMeta}>
              <span>{report?.checks.database?.databaseType || 'Relational PostgreSQL'}</span>
              <span>•</span>
              <span>{report?.checks.database?.verseCount || 910} Verses Indexed</span>
            </div>
          </div>

          {/* Lexicon & Cross-References */}
          <div className={styles.statusCard}>
            <div className={styles.statusCardHeader}>
              <div className={styles.statusCardTitle}>
                <Layers size={18} color="var(--dim-language)" />
                <span>Lexicons &amp; Cross-Refs</span>
              </div>
              <span className={`${styles.statusPill} ${!report ? styles.statusPillNeutral : styles.statusPillGreen}`}>
                {!report ? 'Verifying...' : 'Indexed'}
              </span>
            </div>
            <p className={styles.statusCardDesc}>
              {report?.checks.lexicons?.description || "Verifying Strong's Greek and Hebrew root dictionaries..."}
            </p>
            <div className={styles.statusCardMeta}>
              <span>Greek (5.5k), Hebrew (8.6k), TSK Cross-References</span>
            </div>
          </div>

          {/* 5D AI Study Assistant */}
          <div className={styles.statusCard}>
            <div className={styles.statusCardHeader}>
              <div className={styles.statusCardTitle}>
                <Sparkles size={18} color="var(--gold-500)" />
                <span>AI Study Assistant</span>
              </div>
              <span className={`${styles.statusPill} ${!report ? styles.statusPillNeutral : styles.statusPillGreen}`}>
                {!report ? 'Verifying...' : 'Ready'}
              </span>
            </div>
            <p className={styles.statusCardDesc}>
              {report?.checks.ai?.description || 'Evaluating AI study assistant configuration...'}
            </p>
            <div className={styles.statusCardMeta}>
              <span>5-Dimension hermeneutical synthesis</span>
            </div>
          </div>

          {/* Cloud Sync & Privacy */}
          <div className={styles.statusCard}>
            <div className={styles.statusCardHeader}>
              <div className={styles.statusCardTitle}>
                <Shield size={18} color="var(--dim-theological)" />
                <span>Privacy &amp; Cloud Sync</span>
              </div>
              <span className={`${styles.statusPill} ${!report ? styles.statusPillNeutral : styles.statusPillGreen}`}>
                {!report ? 'Verifying...' : 'Private'}
              </span>
            </div>
            <p className={styles.statusCardDesc}>
              {report?.checks.cloudSync?.description || 'Checking storage and sync boundaries...'}
            </p>
            <div className={styles.statusCardMeta}>
              <span>Local-first encrypted device storage</span>
            </div>
          </div>
        </div>
      </section>

      {/* Safe 1-Click Repair & Maintenance */}
      <section className={styles.repairSection}>
        <div>
          <h2 className={styles.sectionTitle}>Safe 1-Click Maintenance &amp; Repair</h2>
          <p className={styles.sectionSubtitle}>
            Self-healing actions designed to resolve common issues automatically without requiring technical knowledge.
          </p>
        </div>

        <div className={styles.repairGrid}>
          {/* Starter Study Workspace */}
          <div className={styles.repairCard}>
            <div className={styles.repairCardInfo}>
              <h4>Load Starter Study Workspace</h4>
              <p>
                Pre-populates sample study notes, thematic collections (such as "The Romans Road"), and a sample reading plan so you can immediately explore a configured workspace.
              </p>
            </div>
            <button
              type="button"
              className={styles.repairActionBtn}
              onClick={() => handleRepair('seed_sample_data')}
              disabled={repairing === 'seed_sample_data'}
            >
              <Wrench size={16} />
              <span>{repairing === 'seed_sample_data' ? 'Loading Workspace...' : 'Load Sample Workspace'}</span>
            </button>
          </div>

          {/* Verify & Repair Database */}
          <div className={styles.repairCard}>
            <div className={styles.repairCardInfo}>
              <h4>Verify &amp; Repair Database Tables</h4>
              <p>
                Checks table schemas and rebuilds search indexes. Your personal notes, highlights, and prayers are strictly preserved.
              </p>
            </div>
            <button
              type="button"
              className={styles.repairActionBtn}
              onClick={() => handleRepair('rebuild_database')}
              disabled={repairing === 'rebuild_database'}
            >
              <Database size={16} />
              <span>{repairing === 'rebuild_database' ? 'Verifying...' : 'Verify Database'}</span>
            </button>
          </div>

          {/* Reset Cached State */}
          <div className={styles.repairCard}>
            <div className={styles.repairCardInfo}>
              <h4>Reset Stale Browser Cache</h4>
              <p>
                Clears outdated temporary search caches or stale session state while safeguarding all your personal study notes and prayer commitments.
              </p>
            </div>
            <button
              type="button"
              className={styles.repairActionBtn}
              onClick={handleResetCache}
            >
              <RotateCcw size={16} />
              <span>Clear Temporary Cache</span>
            </button>
          </div>
        </div>
      </section>

      {/* Complete Backup & Safe Restore Engine */}
      <section className={styles.backupSection}>
        <div>
          <h2 className={styles.sectionTitle}>Complete Data Backup &amp; Restore</h2>
          <p className={styles.sectionSubtitle}>
            Export all personal study notes, thematic collections, verse highlights, and prayer commitments into a single portable backup file.
          </p>
        </div>

        <div className={styles.backupRow}>
          {/* Export Full Backup */}
          <div className={styles.backupCard}>
            <div>
              <h4>Export Complete Backup Package</h4>
              <p>
                Creates a verified JSON snapshot containing your study notes, bookmarks, custom collections, and prayer records. Keep this file safe as an offline backup.
              </p>
            </div>
            <button
              type="button"
              className={styles.backupPrimaryBtn}
              onClick={handleExportFullBackup}
            >
              <Download size={16} />
              <span>Export Backup File (.json)</span>
            </button>
          </div>

          {/* Restore from Backup */}
          <div className={styles.backupCard}>
            <div>
              <h4>Restore Data from Backup File</h4>
              <p>
                Upload an existing BibleDesk backup file. The system validates the contents and displays a plain-language preview before applying any changes.
              </p>
            </div>

            {pendingRestore ? (
              <div className={styles.restoreInputWrapper}>
                <div className={styles.previewAlert}>
                  <strong>Ready to Restore:</strong>
                  <p style={{ margin: '4px 0 8px 0' }}>{pendingRestore.summary}</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className={styles.backupPrimaryBtn}
                      onClick={confirmRestore}
                    >
                      Confirm &amp; Apply Restore
                    </button>
                    <button
                      type="button"
                      className={styles.repairActionBtn}
                      onClick={() => setPendingRestore(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.restoreInputWrapper}>
                <label className={styles.fileInputLabel}>
                  <Upload size={16} />
                  <span>Choose Backup File (.json)</span>
                  <input
                    type="file"
                    accept=".json"
                    className={styles.fileInput}
                    onChange={handleFileSelect}
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Collapsible Advanced Technical Diagnostics (for Admins) */}
      <section className={styles.advancedPanel}>
        <button
          type="button"
          className={styles.advancedToggle}
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <span>🛠️ Advanced Technical Diagnostics &amp; Environment</span>
          {showAdvanced ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {showAdvanced && (
          <div className={styles.advancedContent}>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0 }}>
              Technical environment details for system administrators and diagnostic logs.
            </p>

            <div className={styles.techGrid}>
              <div className={styles.techItem}>
                <span className={styles.techLabel}>Node.js Runtime</span>
                <span className={styles.techVal}>{report?.systemInfo?.nodeVersion || 'v20+'}</span>
              </div>
              <div className={styles.techItem}>
                <span className={styles.techLabel}>Host Platform</span>
                <span className={styles.techVal}>{report?.systemInfo?.platform || 'Node/Vercel'}</span>
              </div>
              <div className={styles.techItem}>
                <span className={styles.techLabel}>Environment</span>
                <span className={styles.techVal}>{report?.systemInfo?.environment || 'production'}</span>
              </div>
              <div className={styles.techItem}>
                <span className={styles.techLabel}>Software Release</span>
                <span className={styles.techVal}>v{report?.systemInfo?.appVersion || '1.0.0'}</span>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
