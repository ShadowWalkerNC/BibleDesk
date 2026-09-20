import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SCREENSHOTS_DIR = "C:\\Users\\white\\.gemini\antigravity\\brain\\1551747f-b7ff-4b9e-bad3-0fe5080f61af\\screenshots";
const TEMP_USER_DATA_DIR = "C:\\Users\\white\\.gemini\\antigravity\\brain\\1551747f-b7ff-4b9e-bad3-0fe5080f61af\\scratch\\clean_chrome_profile";

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.callbacks = new Map();
    this.consoleLogs = [];
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) {
          reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        } else {
          resolve(msg.result);
        }
      } else if (msg.method) {
        if (msg.method === 'Runtime.consoleAPICalled') {
          const text = msg.params.args?.map(a => a.value ?? a.description ?? '').join(' ');
          this.consoleLogs.push({ type: msg.params.type, text });
        }
        if (msg.method === 'Runtime.exceptionThrown') {
          this.consoleLogs.push({ type: 'error', text: msg.params.exceptionDetails?.text || 'Uncaught exception' });
        }
      }
    };
  }

  send(method, params = {}, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      const timer = setTimeout(() => {
        this.callbacks.delete(id);
        console.warn(`[CDP] Method ${method} timed out after ${timeoutMs}ms, proceeding gracefully.`);
        resolve(null);
      }, timeoutMs);

      this.callbacks.set(id, {
        resolve: (val) => { clearTimeout(timer); resolve(val); },
        reject: (err) => { clearTimeout(timer); reject(err); }
      });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async close() {
    if (this.ws) {
      try { this.ws.close(); } catch {}
    }
  }
}

async function runUAT() {
  console.log('--- BibleDesk UAT & Chrome DevTools Inspection Harness ---');

  await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });
  await fs.mkdir(TEMP_USER_DATA_DIR, { recursive: true });

  console.log('1. Launching isolated headless Chrome...');
  const chromeProcess = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${TEMP_USER_DATA_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--disable-sync',
    '--disable-extensions',
    '--window-size=1440,900',
    'about:blank'
  ], { stdio: 'ignore' });

  await sleep(2500);

  try {
    const versionRes = await fetch('http://127.0.0.1:9222/json/version');
    const versionData = await versionRes.json();
    console.log('Connected to Chrome:', versionData['Browser']);

    const targetsRes = await fetch('http://127.0.0.1:9222/json/list');
    const targets = await targetsRes.json();
    const pageTarget = targets.find(t => t.type === 'page') || targets[0];
    if (!pageTarget) throw new Error('No page target found');

    const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();
    console.log('CDP WebSocket connected!');

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('DOM.enable');

    const viewports = [
      { name: 'desktop', width: 1440, height: 900, dsf: 1, mobile: false },
      { name: 'tablet', width: 820, height: 1180, dsf: 1.5, mobile: false },
      { name: 'mobile', width: 390, height: 844, dsf: 2, mobile: true }
    ];

    const auditResults = {
      pagesTested: [],
      consoleErrors: [],
      visualIssues: [],
      workflowVerifications: []
    };

    async function setViewport(vp) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: vp.dsf,
        mobile: vp.mobile
      });
      if (vp.mobile) {
        await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true });
      } else {
        await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
      }
    }

    async function takeScreenshot(filename) {
      const res = await cdp.send('Page.captureScreenshot', { format: 'png' });
      if (res && res.data) {
        const filePath = path.join(SCREENSHOTS_DIR, filename);
        await fs.writeFile(filePath, Buffer.from(res.data, 'base64'));
        console.log(`Saved screenshot: ${filename}`);
        return filePath;
      }
      return null;
    }

    async function navigateAndInspect(urlPath, pageName, vp) {
      const fullUrl = `http://localhost:3000${urlPath}`;
      console.log(`Testing: ${pageName} on ${vp.name}`);
      await setViewport(vp);
      await cdp.send('Page.navigate', { url: fullUrl });
      await sleep(1500);

      const evalData = await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          const title = document.title;
          const h1 = document.querySelector('h1')?.innerText?.trim() || '';
          const bodyOverflowX = document.body.scrollWidth > window.innerWidth;
          const buttons = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean);
          const hasModal = !!document.querySelector('[role="dialog"], [class*="Modal"], [class*="modal"]');
          return { title, h1, bodyOverflowX, buttonsCount: buttons.length, sampleButtons: buttons.slice(0, 6), hasModal };
        })()`,
        returnByValue: true
      });

      const result = evalData?.result?.value || {};
      const filename = `${urlPath.replace(/\//g, '') || 'home'}_${vp.name}.png`;
      await takeScreenshot(filename);

      auditResults.pagesTested.push({
        url: urlPath,
        name: pageName,
        viewport: vp.name,
        evaluation: result
      });

      if (result.bodyOverflowX) {
        auditResults.visualIssues.push({
          page: urlPath,
          viewport: vp.name,
          issue: 'Horizontal overflow detected'
        });
      }

      return result;
    }

    // 1. Home Page Across Viewports
    for (const vp of viewports) {
      await navigateAndInspect('/', 'Home Page', vp);
    }

    // 2. Bible Study Desk (Triggers Onboarding on First Visit!)
    console.log('\n--- Testing First-Time Visit to /bible (Onboarding Flow) ---');
    await setViewport(viewports[0]); // Desktop
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/bible' });
    await sleep(1500);
    await takeScreenshot('bible_first_visit_onboarding_modal_desktop.png');

    // Step through the onboarding modal
    console.log('Stepping through Onboarding Modal on Desktop:');
    // Step 1: Click next
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const next = btns.find(b => b.innerText.includes('Next') || b.innerText.includes('Study Preferences'));
        if (next) next.click();
      })()`
    });
    await sleep(600);
    await takeScreenshot('onboarding_step2_desktop.png');

    // Step 2: Next to AI
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const next = btns.find(b => b.innerText.includes('Next') || b.innerText.includes('AI Assistant'));
        if (next) next.click();
      })()`
    });
    await sleep(600);
    await takeScreenshot('onboarding_step3_desktop.png');

    // Step 3: Next to Finish
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const next = btns.find(b => b.innerText.includes('Next') || b.innerText.includes('Ready') || b.innerText.includes('Finish'));
        if (next) next.click();
      })()`
    });
    await sleep(600);
    await takeScreenshot('onboarding_step4_desktop.png');

    // Step 4: Click Enter Study Desk
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const finish = btns.find(b => b.innerText.includes('Enter Study Desk'));
        if (finish) finish.click();
      })()`
    });
    await sleep(1200);
    await takeScreenshot('bible_study_desk_post_onboarding_desktop.png');

    // Now test /bible on Tablet and Mobile
    for (const vp of [viewports[1], viewports[2]]) {
      await navigateAndInspect('/bible', 'Bible Study Desk', vp);
    }

    // 3. Core Pages
    const pages = [
      { path: '/research', name: '5D Research Assistant' },
      { path: '/prayer', name: 'Prayer Care & World Atlas' },
      { path: '/study-resources', name: 'Study Resources Hub' },
      { path: '/system', name: 'System Health & Diagnostics Hub' },
      { path: '/mod', name: 'Moderation Command Center' },
      { path: '/pricing', name: 'Pricing & SaaS Membership' },
      { path: '/developers', name: 'Developer REST API & MCP' },
      { path: '/download', name: 'PWA Download & Setup' },
      { path: '/login', name: 'Login & Authentication' }
    ];

    for (const p of pages) {
      for (const vp of viewports) {
        await navigateAndInspect(p.path, p.name, vp);
      }
    }

    // 4. Interactive Workflows
    console.log('\n--- Testing Interactive Workflows ---');
    // 4A: Select verse on Desktop
    await setViewport(viewports[0]);
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/bible' });
    await sleep(1200);
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const v = document.querySelector('[class*="verseText"]');
        if (v) v.click();
      })()`
    });
    await sleep(800);
    await takeScreenshot('workflow_verse_selected.png');

    // 4B: Open Compare Tab
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Compare'));
        if (btn) btn.click();
      })()`
    });
    await sleep(800);
    await takeScreenshot('workflow_compare_translations.png');

    // 4C: Open References Tab
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('References') || b.innerText.includes('Cross'));
        if (btn) btn.click();
      })()`
    });
    await sleep(800);
    await takeScreenshot('workflow_cross_references.png');

    // 4D: System Health Hub 1-Click Repair button check
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/system' });
    await sleep(1500);
    await takeScreenshot('workflow_system_health.png');

    // 4E: Mobile Moderation Rapid Triage
    await setViewport(viewports[2]);
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/mod' });
    await sleep(1200);
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Rapid'));
        if (btn) btn.click();
      })()`
    });
    await sleep(800);
    await takeScreenshot('workflow_mod_rapid_mobile.png');

    // Log errors
    const errors = cdp.consoleLogs.filter(l => l.type === 'error' || l.text.toLowerCase().includes('error'));
    auditResults.consoleErrors = errors;
    console.log(`\nCaptured ${errors.length} console errors.`);

    const reportPath = path.join(SCREENSHOTS_DIR, 'uat_inspection_report.json');
    await fs.writeFile(reportPath, JSON.stringify(auditResults, null, 2));
    console.log('Audit completed and report saved!');

    await cdp.close();
  } catch (err) {
    console.error('Inspection error:', err);
  } finally {
    try { chromeProcess.kill(); } catch {}
  }
}

runUAT().then(() => process.exit(0)).catch(() => process.exit(1));
