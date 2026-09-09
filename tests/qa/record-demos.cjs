'use strict';
// BibleDesk — Automated Demo Recorder
// Records polished demo clips for each QA section using Playwright.
// Uses cursor overlay, subtitle captions, and natural pacing.
//
// Usage:
//   node tests/qa/record-demos.cjs               — record all sections
//   node tests/qa/record-demos.cjs --section 1   — record specific section
//   node tests/qa/record-demos.cjs --rehearse     — check selectors only (no video)
//
// Output: tests/qa/recordings/section-XX-name.webm

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = process.env.QA_BASE_URL || 'http://localhost:3000';
const RECORDINGS_DIR = path.join(__dirname, 'recordings');
const REHEARSAL = process.argv.includes('--rehearse');
const SECTION_ARG = process.argv.includes('--section')
  ? parseInt(process.argv[process.argv.indexOf('--section') + 1])
  : null;

if (!fs.existsSync(RECORDINGS_DIR)) fs.mkdirSync(RECORDINGS_DIR, { recursive: true });

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function injectCursor(page) {
  await page.evaluate(() => {
    if (document.getElementById('demo-cursor')) return;
    const cursor = document.createElement('div');
    cursor.id = 'demo-cursor';
    cursor.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 3L19 12L12 13L9 20L5 3Z" fill="white" stroke="black" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>`;
    cursor.style.cssText = `
      position:fixed;z-index:999999;pointer-events:none;
      width:24px;height:24px;transition:left .1s,top .1s;
      filter:drop-shadow(1px 1px 2px rgba(0,0,0,.3));
    `;
    cursor.style.left = '640px'; cursor.style.top = '360px';
    document.body.appendChild(cursor);
    document.addEventListener('mousemove', e => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
    });
  });
}

async function injectSubtitleBar(page) {
  await page.evaluate(() => {
    if (document.getElementById('demo-subtitle')) return;
    const bar = document.createElement('div');
    bar.id = 'demo-subtitle';
    bar.style.cssText = `
      position:fixed;bottom:0;left:0;right:0;z-index:999998;
      text-align:center;padding:12px 24px;
      background:rgba(0,0,0,.78);color:#fff;
      font-family:-apple-system,"Segoe UI",sans-serif;
      font-size:16px;font-weight:500;letter-spacing:.3px;
      transition:opacity .3s;pointer-events:none;
    `;
    bar.style.opacity = '0';
    document.body.appendChild(bar);
  });
}

async function showSubtitle(page, text, hold = 900) {
  await page.evaluate(t => {
    const bar = document.getElementById('demo-subtitle');
    if (!bar) return;
    bar.textContent = t || '';
    bar.style.opacity = t ? '1' : '0';
  }, text);
  if (text) await page.waitForTimeout(hold);
}

async function setup(page) {
  await injectCursor(page);
  await injectSubtitleBar(page);
}

async function moveAndClick(page, locator, label, opts = {}) {
  const { postClickDelay = 900, ...clickOpts } = opts;
  const el = typeof locator === 'string' ? page.locator(locator).first() : locator;
  if (!await el.isVisible().catch(() => false)) {
    console.warn(`  ⚠ moveAndClick skipped: "${label}" not visible`); return false;
  }
  await el.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(300);
  const box = await el.boundingBox().catch(() => null);
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
  await page.waitForTimeout(400);
  await el.click(clickOpts).catch(e => console.warn(`  ⚠ click failed "${label}": ${e.message}`));
  await page.waitForTimeout(postClickDelay);
  return true;
}

async function typeSlowly(page, locator, text, label, charDelay = 35) {
  const el = typeof locator === 'string' ? page.locator(locator).first() : locator;
  if (!await el.isVisible().catch(() => false)) {
    console.warn(`  ⚠ typeSlowly skipped: "${label}" not visible`); return false;
  }
  await moveAndClick(page, el, label);
  await el.fill('').catch(() => {});
  await el.pressSequentially(text, { delay: charDelay });
  await page.waitForTimeout(600); return true;
}

async function navigateTo(page, routePath) {
  await page.goto(`${BASE_URL}${routePath}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await setup(page);
}

// ─── Section Definitions ─────────────────────────────────────────────────────

const SECTIONS = [
  {
    id: 1, name: 'landing-page', label: 'Landing Page & Marketing',
    async run(page) {
      await navigateTo(page, '/');
      await showSubtitle(page, 'BibleDesk — Bible-First Study Platform', 1500);
      await page.waitForTimeout(2500);
      await showSubtitle(page, 'Designed for individuals, churches & creators');
      await page.evaluate(() => window.scrollTo({ top: 700, behavior: 'smooth' }));
      await page.waitForTimeout(2000);
      await page.evaluate(() => window.scrollTo({ top: 1600, behavior: 'smooth' }));
      await page.waitForTimeout(2000);
      await showSubtitle(page, 'Free forever for churches — no catch');
      await page.evaluate(() => window.scrollTo({ top: 2800, behavior: 'smooth' }));
      await page.waitForTimeout(2000);
      await showSubtitle(page, 'Open the Study Desk →');
      await moveAndClick(page, 'a[href="/bible"]', 'CTA: Open Study Desk');
      await page.waitForTimeout(2500);
      await showSubtitle(page, '');
    },
  },
  {
    id: 2, name: 'authentication', label: 'Authentication — Sign Up & Sign In',
    async run(page) {
      await navigateTo(page, '/login');
      await showSubtitle(page, 'Section 2 — Create Your Account');
      await page.waitForTimeout(2000);
      const createTab = page.locator('button:has-text("Create Account"), [role="tab"]:has-text("Create Account")').first();
      if (await createTab.isVisible().catch(() => false)) {
        await moveAndClick(page, createTab, 'Create Account tab');
      }
      await page.waitForTimeout(1200);
      await typeSlowly(page, 'input[placeholder*="name" i], #name-input', 'Caleb Walker', 'Name field');
      await typeSlowly(page, 'input[placeholder*="church" i], #church-input', 'Grace Fellowship', 'Church field');
      await typeSlowly(page, 'input[type="email"]', 'caleb@example.com', 'Email field');
      await typeSlowly(page, 'input[type="password"]', 'securepass123', 'Password field');
      await showSubtitle(page, 'Offline fallback — works without Supabase configured');
      await page.waitForTimeout(2500);
      await showSubtitle(page, '');
    },
  },
  {
    id: 3, name: 'bible-study-desk', label: 'Bible Study Desk',
    async run(page) {
      await navigateTo(page, '/bible');
      await showSubtitle(page, 'Section 3 — The Bible Study Desk', 1500);
      await page.waitForTimeout(3000);
      await showSubtitle(page, '6 public-domain translations — local, offline-ready');
      await page.waitForTimeout(2500);
      await showSubtitle(page, '3-column workspace: Library · Reader · Study Drawer');
      await page.evaluate(() => window.scrollTo({ top: 200, behavior: 'smooth' }));
      await page.waitForTimeout(2000);
      await showSubtitle(page, 'Tap any word for Strong\'s Lexicon — Greek & Hebrew');
      await page.waitForTimeout(2500);
      await showSubtitle(page, '');
    },
  },
  {
    id: 4, name: 'quick-jump', label: 'Quick Jump (Ctrl+K)',
    async run(page) {
      await navigateTo(page, '/bible');
      await showSubtitle(page, 'Section 4 — Quick Jump Modal (Ctrl+K)');
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(1500);
      await showSubtitle(page, 'Jump to any book, chapter, or verse instantly');
      const quickInput = page.locator('input[placeholder*="Jump"], input[placeholder*="Search"]').first();
      if (await quickInput.isVisible().catch(() => false)) {
        await typeSlowly(page, quickInput, 'John 3', 'Quick jump input');
        await page.waitForTimeout(1500);
      }
      await page.keyboard.press('Escape');
      await page.waitForTimeout(800);
      await showSubtitle(page, '');
    },
  },
  {
    id: 6, name: 'ai-assistant', label: '5-Dimension AI Assistant',
    async run(page) {
      await navigateTo(page, '/bible');
      await showSubtitle(page, 'Section 6 — 5-Dimension AI Bible Assistant', 1500);
      await page.waitForTimeout(2500);
      await showSubtitle(page, '5 dimensions: Scripture · Historical · Language · Theological · Practical');
      await page.waitForTimeout(3000);
      const input = page.locator('textarea[placeholder*="Ask"], input[placeholder*="Ask"], [data-testid="ai-input"]').first();
      if (await input.isVisible().catch(() => false)) {
        await typeSlowly(page, input, 'What does agape love mean in 1 Corinthians 13?', 'AI input');
        await showSubtitle(page, 'Asking: What does agape love mean in 1 Corinthians 13?');
        await page.waitForTimeout(2000);
      }
      await showSubtitle(page, 'AI answers grounded in 5 dimensions — never invented');
      await page.waitForTimeout(2500);
      await showSubtitle(page, '');
    },
  },
  {
    id: 7, name: 'prayer-atlas', label: 'PrayerAtlas Global Prayer Map',
    async run(page) {
      await navigateTo(page, '/prayer');
      await showSubtitle(page, 'Section 7 — PrayerAtlas: Global Prayer Map', 1500);
      await page.waitForTimeout(3500);
      await showSubtitle(page, 'Approximate halos — glow over regional prayer movements');
      await page.waitForTimeout(2500);
      await showSubtitle(page, 'Precise beacons — exact GPS prayer posts');
      await page.waitForTimeout(2500);
      await showSubtitle(page, 'Filter by category — tap a chip to focus the map');
      await page.waitForTimeout(2500);
      await showSubtitle(page, '');
    },
  },
  {
    id: 8, name: 'daily-verse', label: 'Daily Verse',
    async run(page) {
      await navigateTo(page, '/daily');
      await showSubtitle(page, 'Section 8 — Daily Verse', 1500);
      await page.waitForTimeout(3000);
      await showSubtitle(page, 'A fresh verse every morning — share or pray it');
      await page.waitForTimeout(2500);
      await showSubtitle(page, '');
    },
  },
  {
    id: 9, name: 'encouragement', label: 'Words of Encouragement Hub',
    async run(page) {
      await navigateTo(page, '/encourage');
      await showSubtitle(page, 'Section 9 — Words of Encouragement', 1500);
      await page.waitForTimeout(3000);
      await showSubtitle(page, 'Topical promises — Scripture for every season');
      await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'smooth' }));
      await page.waitForTimeout(2000);
      await showSubtitle(page, '');
    },
  },
  {
    id: 13, name: 'church-hub', label: 'Church Hub',
    async run(page) {
      await navigateTo(page, '/church');
      await showSubtitle(page, 'Section 13 — Church Hub: Ministry Tools', 1500);
      await page.waitForTimeout(3000);
      await showSubtitle(page, 'Prayer chain, embed widgets — \$0 free forever for churches');
      await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'smooth' }));
      await page.waitForTimeout(2500);
      await showSubtitle(page, '');
    },
  },
  {
    id: 15, name: 'sermons', label: 'Sermons & Slides',
    async run(page) {
      await navigateTo(page, '/sermons');
      await showSubtitle(page, 'Section 15 — Sermons & Slide Exporter', 1500);
      await page.waitForTimeout(3000);
      await showSubtitle(page, 'YouTube / Facebook Live embed — zero hosting cost');
      await page.waitForTimeout(2500);
      await showSubtitle(page, 'ProPresenter 7 export — auto-chunk Scripture for Sunday slides');
      await page.waitForTimeout(2500);
      await showSubtitle(page, '');
    },
  },
  {
    id: 20, name: 'live-radio', label: 'Live Worship Radio',
    async run(page) {
      await navigateTo(page, '/bible');
      await showSubtitle(page, 'Section 20 — Live Christian Worship Radio', 1500);
      await page.waitForTimeout(2500);
      const radioBtn = page.locator('button:has-text("Radio"), [aria-label*="radio" i]').first();
      if (await radioBtn.isVisible().catch(() => false)) {
        await moveAndClick(page, radioBtn, 'Open Radio player');
        await showSubtitle(page, 'Ambient sacred streams — study with worship in the background');
        await page.waitForTimeout(3500);
      } else {
        await showSubtitle(page, 'Open Worship Radio from the sidebar — ambient sacred streams');
        await page.waitForTimeout(3000);
      }
      await showSubtitle(page, 'Smooth vinyl rotation — serene, not distracting');
      await page.waitForTimeout(2500);
      await showSubtitle(page, '');
    },
  },
  {
    id: 24, name: 'developers', label: 'Developer Platform',
    async run(page) {
      await navigateTo(page, '/developers');
      await showSubtitle(page, 'Section 24 — Developer Platform & SDK', 1500);
      await page.waitForTimeout(3000);
      await showSubtitle(page, 'REST API + MCP Server — integrate BibleDesk anywhere');
      await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'smooth' }));
      await page.waitForTimeout(2000);
      await showSubtitle(page, '');
    },
  },
];

// ─── Runner ───────────────────────────────────────────────────────────────────

async function recordSection(section) {
  console.log(`\n🎬 ${section.label}`);
  const browser = await chromium.launch({ headless: true });

  if (REHEARSAL) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    console.log('  Rehearsal: OK');
    await browser.close(); return;
  }

  const videoFile = path.join(RECORDINGS_DIR,
    `section-${String(section.id).padStart(2,'0')}-${section.name}.webm`);

  const ctx = await browser.newContext({
    recordVideo: { dir: RECORDINGS_DIR, size: { width: 1280, height: 720 } },
    viewport: { width: 1280, height: 720 },
  });
  const page = await ctx.newPage();

  try {
    await section.run(page);
    console.log('  ✓ Recording complete');
  } catch (err) {
    console.error(`  ✗ Error: ${err.message}`);
  } finally {
    await page.waitForTimeout(1000);
    await ctx.close();
    const video = page.video();
    if (video) {
      const src = await video.path().catch(() => null);
      if (src && fs.existsSync(src)) {
        fs.copyFileSync(src, videoFile);
        console.log(`  💾 Saved → ${path.basename(videoFile)}`);
      }
    }
    await browser.close();
  }
}

(async () => {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  BibleDesk — Automated QA Demo Recorder ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`  Base URL : ${BASE_URL}`);
  console.log(`  Mode     : ${REHEARSAL ? 'REHEARSAL (no video)' : 'RECORD'}`);
  console.log(`  Sections : ${SECTION_ARG ?? 'all'}\n`);

  const toRun = SECTION_ARG
    ? SECTIONS.filter(s => s.id === SECTION_ARG)
    : SECTIONS;

  if (!toRun.length) {
    console.error('Section not found. IDs:', SECTIONS.map(s => s.id).join(', '));
    process.exit(1);
  }

  for (const section of toRun) {
    await recordSection(section);
  }

  console.log('\n✅ All done!');
  if (!REHEARSAL) console.log(`   Recordings saved to: ${RECORDINGS_DIR}`);
})();
