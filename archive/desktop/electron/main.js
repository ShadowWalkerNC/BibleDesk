// BibleDesk Desktop — Electron main process
// Wraps the Next.js app in a BrowserWindow.
// IPC channels:
//   vault:pick      → native folder picker, returns path
//   vault:read      → walk vault, return all .md files
//   vault:write     → write a single .md file to the vault
//   vault:reveal    → open vault in Finder/Explorer
//   graphify:run    → shell out to graphify Python CLI
//   sync:status     → DNS connectivity check

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path   = require('path');
const fs     = require('fs');
const { execFile } = require('child_process');

const isDev    = !app.isPackaged;
const WEB_PORT = process.env.WEB_PORT || 3001;
const WEB_URL  = isDev
  ? `http://localhost:${WEB_PORT}`
  : `file://${path.join(__dirname, '../.next/server/app/index.html')}`;

// ─── Window ──────────────────────────────────────────────────────────────────

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width:          1280,
    height:         820,
    minWidth:       800,
    minHeight:      600,
    titleBarStyle:  process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#06081a',   // --navy-950
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      sandbox:          false,
    },
    icon: path.join(__dirname, '../public/icon.png'),
  });

  mainWindow.loadURL(WEB_URL);

  if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC: vault:pick ─────────────────────────────────────────────────────────

ipcMain.handle('vault:pick', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title:      'Select Obsidian Vault Folder',
    properties: ['openDirectory', 'createDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
});

// ─── IPC: vault:read ─────────────────────────────────────────────────────────

ipcMain.handle('vault:read', async (_event, vaultPath) => {
  if (!vaultPath || typeof vaultPath !== 'string') return [];
  const safeVault = path.resolve(vaultPath);
  const files = [];

  function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        try {
          files.push({
            path:    full,
            relPath: path.relative(safeVault, full),
            content: fs.readFileSync(full, 'utf8'),
          });
        } catch { /* skip unreadable */ }
      }
    }
  }

  walk(safeVault);
  return files;
});

// ─── IPC: vault:write ────────────────────────────────────────────────────────

ipcMain.handle('vault:write', async (_event, { vaultPath, relPath, content }) => {
  if (!vaultPath || !relPath || typeof content !== 'string') {
    return { ok: false, error: 'Invalid arguments' };
  }
  const safeVault = path.resolve(vaultPath);
  const fullPath  = path.resolve(safeVault, relPath);

  // Path traversal guard
  if (!fullPath.startsWith(safeVault + path.sep)) {
    return { ok: false, error: 'Path traversal denied' };
  }
  try {
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf8');
    return { ok: true, path: fullPath };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ─── IPC: vault:reveal ───────────────────────────────────────────────────────

ipcMain.handle('vault:reveal', async (_event, vaultPath) => {
  if (vaultPath) shell.openPath(path.resolve(vaultPath));
  return null;
});

// ─── IPC: graphify:run ───────────────────────────────────────────────────────
// Calls: python -m graphify <vaultPath> --format json --out <outDir>
// graphify must be installed: pip install graphify

ipcMain.handle('graphify:run', async (_event, { vaultPath, outDir }) => {
  if (!vaultPath) return { ok: false, error: 'vaultPath required' };
  const safeVault = path.resolve(vaultPath);
  const safeOut   = outDir ? path.resolve(outDir) : path.join(safeVault, 'graphify-out');

  return new Promise((resolve) => {
    execFile(
      'python',
      ['-m', 'graphify', safeVault, '--format', 'json', '--out', safeOut],
      { timeout: 120_000, maxBuffer: 10 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          resolve({ ok: false, error: stderr || err.message, stdout });
        } else {
          const graphFile = path.join(safeOut, 'graph.json');
          let graph = null;
          try { graph = JSON.parse(fs.readFileSync(graphFile, 'utf8')); } catch { /* ok */ }
          resolve({ ok: true, stdout, graphFile, graph });
        }
      }
    );
  });
});

// ─── IPC: sync:status ────────────────────────────────────────────────────────

ipcMain.handle('sync:status', () => {
  return new Promise((resolve) => {
    require('dns').resolve4('supabase.com', (err) => {
      resolve({ online: !err });
    });
  });
});
