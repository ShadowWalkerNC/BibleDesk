'use client';

// BibleDesk Desktop — DesktopShell
// Slim native top bar: vault picker, graphify rebuild button, sync indicator.
// Reads window.bibledesk (injected by preload.js).
// Falls back gracefully when window.bibledesk is undefined (plain browser).

import { useEffect, useState, useCallback } from 'react';
import styles from './DesktopShell.module.css';

declare global {
  interface Window {
    bibledesk?: {
      isDesktop:   boolean;
      pickVault:   () => Promise<string | null>;
      readVault:   (p: string) => Promise<{ path: string; relPath: string; content: string }[]>;
      writeVault:  (vault: string, rel: string, content: string) => Promise<{ ok: boolean; error?: string }>;
      revealVault: (p: string) => Promise<null>;
      runGraphify: (vault: string, out?: string) => Promise<{ ok: boolean; error?: string; graph?: unknown; graphFile?: string }>;
      syncStatus:  () => Promise<{ online: boolean }>;
    };
  }
}

const VAULT_KEY = 'bibledesk_vault_path';
type GraphifyStatus = 'idle' | 'running' | 'done' | 'error';
type SyncStatus    = 'unknown' | 'online' | 'offline';

export default function DesktopShell({ children }: { children: React.ReactNode }) {
  const isDesktop = typeof window !== 'undefined' && !!window.bibledesk?.isDesktop;

  const [vaultPath,      setVaultPath]      = useState('');
  const [graphifyStatus, setGraphifyStatus] = useState<GraphifyStatus>('idle');
  const [graphifyMsg,    setGraphifyMsg]    = useState('');
  const [syncStatus,     setSyncStatus]     = useState<SyncStatus>('unknown');
  const [vaultFiles,     setVaultFiles]     = useState(0);

  const refreshVaultCount = useCallback(async (p: string) => {
    if (!p || !window.bibledesk) return;
    const files = await window.bibledesk.readVault(p);
    setVaultFiles(files.length);
  }, []);

  const checkSync = useCallback(async () => {
    if (!window.bibledesk) return;
    const { online } = await window.bibledesk.syncStatus();
    setSyncStatus(online ? 'online' : 'offline');
  }, []);

  useEffect(() => {
    if (!isDesktop) return;
    const saved = localStorage.getItem(VAULT_KEY) ?? '';
    if (saved) { setVaultPath(saved); refreshVaultCount(saved); }
    checkSync();
  }, [isDesktop, refreshVaultCount, checkSync]);

  async function pickVault() {
    if (!window.bibledesk) return;
    const picked = await window.bibledesk.pickVault();
    if (picked) {
      setVaultPath(picked);
      localStorage.setItem(VAULT_KEY, picked);
      await refreshVaultCount(picked);
    }
  }

  async function runGraphify() {
    if (!vaultPath || !window.bibledesk) return;
    setGraphifyStatus('running');
    setGraphifyMsg('Running graphify…');
    const result = await window.bibledesk.runGraphify(vaultPath);
    if (result.ok) {
      setGraphifyStatus('done');
      setGraphifyMsg('Graph built ✔');
      setTimeout(() => { setGraphifyStatus('idle'); setGraphifyMsg(''); }, 4000);
    } else {
      setGraphifyStatus('error');
      setGraphifyMsg(result.error ?? 'graphify failed');
    }
  }

  function revealVault() {
    if (vaultPath && window.bibledesk) window.bibledesk.revealVault(vaultPath);
  }

  if (!isDesktop) return <>{children}</>;

  const syncColor =
    syncStatus === 'online'  ? 'var(--dim-theological)' :
    syncStatus === 'offline' ? 'var(--dim-practical)'   :
    'var(--text-muted)';

  return (
    <div className={styles.shell}>
      <header className={styles.topBar}>
        <span className={styles.appName}>BibleDesk</span>

        <div className={styles.vaultSection}>
          {vaultPath ? (
            <button className={styles.vaultBtn} onClick={revealVault} title={vaultPath}>
              📂 {vaultPath.split('/').pop() || vaultPath}
              {vaultFiles > 0 && <span className={styles.vaultCount}>{vaultFiles} notes</span>}
            </button>
          ) : (
            <span className={styles.noVault}>No vault selected</span>
          )}
          <button className={styles.pickBtn} onClick={pickVault}>
            {vaultPath ? 'Change…' : 'Open Vault…'}
          </button>
        </div>

        <button
          className={`${styles.graphifyBtn} ${graphifyStatus === 'running' ? styles.graphifyRunning : ''}`}
          onClick={runGraphify}
          disabled={!vaultPath || graphifyStatus === 'running'}
          title="Rebuild knowledge graph from vault using graphify"
        >
          {graphifyStatus === 'running' ? '⧗ Building…' : '↻ Rebuild Graph'}
        </button>

        {graphifyMsg && (
          <span className={`${styles.graphifyMsg} ${
            graphifyStatus === 'error' ? styles.graphifyMsgError : styles.graphifyMsgOk
          }`}>
            {graphifyMsg}
          </span>
        )}

        <div className={styles.syncDot}>
          <span className={styles.dot} style={{ background: syncColor }} />
          <span className={styles.syncLabel}>
            {syncStatus === 'online' ? 'Synced' : syncStatus === 'offline' ? 'Offline' : '…'}
          </span>
          <button className={styles.syncCheckBtn} onClick={checkSync} title="Check sync">
            ↺
          </button>
        </div>
      </header>

      <main className={styles.content}>{children}</main>
    </div>
  );
}
