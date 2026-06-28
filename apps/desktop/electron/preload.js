// BibleDesk Desktop — Electron preload
// Exposes window.bibledesk to the renderer via contextBridge.
// All IPC channels are explicitly allowlisted here.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bibledesk', {
  isDesktop:   true,

  // Vault
  pickVault:   ()                            => ipcRenderer.invoke('vault:pick'),
  readVault:   (vaultPath)                   => ipcRenderer.invoke('vault:read',   vaultPath),
  writeVault:  (vaultPath, relPath, content) => ipcRenderer.invoke('vault:write',  { vaultPath, relPath, content }),
  revealVault: (vaultPath)                   => ipcRenderer.invoke('vault:reveal', vaultPath),

  // Graphify
  runGraphify: (vaultPath, outDir)           => ipcRenderer.invoke('graphify:run', { vaultPath, outDir }),

  // Sync
  syncStatus:  ()                            => ipcRenderer.invoke('sync:status'),
});
