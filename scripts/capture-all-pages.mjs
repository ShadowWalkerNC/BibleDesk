import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SCREENSHOTS_DIR = "C:\\Users\\white\\.gemini\\antigravity\\brain\\1551747f-b7ff-4b9e-bad3-0fe5080f61af\\screenshots";
const TEMP_PROFILE = "C:\\Users\\white\\.gemini\\antigravity\\brain\\1551747f-b7ff-4b9e-bad3-0fe5080f61af\\scratch\\uat_profile_9223";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });
  await fs.mkdir(TEMP_PROFILE, { recursive: true });

  console.log('Starting headless Chrome on port 9223...');
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9223',
    `--user-data-dir=${TEMP_PROFILE}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1440,900',
    'about:blank'
  ]);

  await sleep(3000);

  const listRes = await fetch('http://127.0.0.1:9223/json/list');
  const targets = await listRes.json();
  const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
  console.log('Target found:', pageTarget.title);

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve) => (ws.onopen = resolve));
  console.log('WebSocket connected!');

  let id = 1;
  const callbacks = new Map();
  const consoleLogs = [];

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && callbacks.has(msg.id)) {
      const cb = callbacks.get(msg.id);
      callbacks.delete(msg.id);
      cb(msg.result);
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      const text = msg.params.args?.map(a => a.value ?? a.description ?? '').join(' ');
      consoleLogs.push({ type: msg.params.type, text });
    }
  };

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const msgId = id++;
      const timer = setTimeout(() => {
        callbacks.delete(msgId);
        resolve(null);
      }, 10000);

      callbacks.set(msgId, (res) => {
        clearTimeout(timer);
        resolve(res);
      });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');

  async function setSize(width, height, dsf = 1) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: dsf,
      mobile: width < 600
    });
  }

  async function snap(filename) {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    if (res && res.data) {
      const outPath = path.join(SCREENSHOTS_DIR, filename);
      await fs.writeFile(outPath, Buffer.from(res.data, 'base64'));
      console.log(`✓ Saved ${filename}`);
    }
  }

  // 1. Desktop Onboarding Modal on /bible
  console.log('\n--- Test 1: Desktop /bible First-Run Onboarding Modal ---');
  await setSize(1440, 900);
  await send('Page.navigate', { url: 'http://localhost:3000/bible' });
  await sleep(2500);
  await snap('01_bible_onboarding_modal_desktop.png');

  // Step through onboarding modal
  console.log('Stepping through onboarding modal...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Next'));
      if (btn) btn.click();
    })()`
  });
  await sleep(800);
  await snap('02_onboarding_step2_desktop.png');

  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Next'));
      if (btn) btn.click();
    })()`
  });
  await sleep(800);
  await snap('03_onboarding_step3_desktop.png');

  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Next') || b.innerText.includes('Ready'));
      if (btn) btn.click();
    })()`
  });
  await sleep(800);
  await snap('04_onboarding_step4_desktop.png');

  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Enter Study Desk'));
      if (btn) btn.click();
    })()`
  });
  await sleep(2000);
  await snap('05_bible_study_desk_desktop.png');

  // 2. Select verse and check tabs on desktop
  console.log('\n--- Test 2: Bible Study Desk Interactions ---');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const v = document.querySelector('[class*="verseText"]');
      if (v) v.click();
    })()`
  });
  await sleep(1000);
  await snap('06_bible_verse_selected_desktop.png');

  // Compare Tab
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Compare'));
      if (btn) btn.click();
    })()`
  });
  await sleep(1000);
  await snap('07_bible_compare_tab_desktop.png');

  // References Tab
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('References') || b.innerText.includes('Cross'));
      if (btn) btn.click();
    })()`
  });
  await sleep(1000);
  await snap('08_bible_references_tab_desktop.png');

  // 3. Tablet & Mobile /bible
  console.log('\n--- Test 3: /bible Responsive Layouts ---');
  await setSize(820, 1180, 1.5); // Tablet
  await send('Page.navigate', { url: 'http://localhost:3000/bible' });
  await sleep(2000);
  await snap('09_bible_tablet.png');

  await setSize(390, 844, 2); // Mobile
  await send('Page.navigate', { url: 'http://localhost:3000/bible' });
  await sleep(2000);
  await snap('10_bible_mobile.png');

  // 4. Research Assistant (/research)
  console.log('\n--- Test 4: Research Assistant Workbench ---');
  await setSize(1440, 900);
  await send('Page.navigate', { url: 'http://localhost:3000/research' });
  await sleep(2000);
  await snap('11_research_desktop.png');

  await setSize(390, 844, 2);
  await send('Page.navigate', { url: 'http://localhost:3000/research' });
  await sleep(1500);
  await snap('12_research_mobile.png');

  // 5. System Health, Diagnostics & Recovery (/system)
  console.log('\n--- Test 5: System Health Hub ---');
  await setSize(1440, 900);
  await send('Page.navigate', { url: 'http://localhost:3000/system' });
  await sleep(2000);
  await snap('13_system_desktop.png');

  await send('Runtime.evaluate', {
    expression: `(() => {
      const details = document.querySelector('details');
      if (details) details.open = true;
    })()`
  });
  await sleep(500);
  await snap('14_system_expanded_telemetry_desktop.png');

  await setSize(390, 844, 2);
  await send('Page.navigate', { url: 'http://localhost:3000/system' });
  await sleep(1500);
  await snap('15_system_mobile.png');

  // 6. Moderation Command Center (/mod)
  console.log('\n--- Test 6: Moderation Command Center ---');
  await setSize(1440, 900);
  await send('Page.navigate', { url: 'http://localhost:3000/mod' });
  await sleep(2000);
  await snap('16_mod_desktop.png');

  await setSize(390, 844, 2);
  await send('Page.navigate', { url: 'http://localhost:3000/mod' });
  await sleep(1500);
  await snap('17_mod_mobile.png');

  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Rapid'));
      if (btn) btn.click();
    })()`
  });
  await sleep(800);
  await snap('18_mod_rapid_triage_mobile.png');

  // 7. Prayer & World Atlas (/prayer)
  console.log('\n--- Test 7: Prayer & World Atlas ---');
  await setSize(1440, 900);
  await send('Page.navigate', { url: 'http://localhost:3000/prayer' });
  await sleep(2500);
  await snap('19_prayer_desktop.png');

  await setSize(390, 844, 2);
  await send('Page.navigate', { url: 'http://localhost:3000/prayer' });
  await sleep(2000);
  await snap('20_prayer_mobile.png');

  // 8. Study Resources Hub (/study-resources)
  console.log('\n--- Test 8: Study Resources Hub ---');
  await setSize(1440, 900);
  await send('Page.navigate', { url: 'http://localhost:3000/study-resources' });
  await sleep(2000);
  await snap('21_study_resources_desktop.png');

  await setSize(390, 844, 2);
  await send('Page.navigate', { url: 'http://localhost:3000/study-resources' });
  await sleep(1500);
  await snap('22_study_resources_mobile.png');

  // 9. Pricing & SaaS Membership (/pricing)
  console.log('\n--- Test 9: Pricing & SaaS Membership ---');
  await setSize(1440, 900);
  await send('Page.navigate', { url: 'http://localhost:3000/pricing' });
  await sleep(1500);
  await snap('23_pricing_desktop.png');

  await setSize(390, 844, 2);
  await send('Page.navigate', { url: 'http://localhost:3000/pricing' });
  await sleep(1500);
  await snap('24_pricing_mobile.png');

  // 10. Login (/login)
  console.log('\n--- Test 10: Authentication & Login ---');
  await setSize(1440, 900);
  await send('Page.navigate', { url: 'http://localhost:3000/login' });
  await sleep(1500);
  await snap('25_login_desktop.png');

  await setSize(390, 844, 2);
  await send('Page.navigate', { url: 'http://localhost:3000/login' });
  await sleep(1500);
  await snap('26_login_mobile.png');

  console.log(`\nAll tests completed. Total console logs: ${consoleLogs.length}`);
  const errors = consoleLogs.filter(l => l.type === 'error');
  console.log(`Total errors captured: ${errors.length}`);
  errors.forEach(e => console.log('  ', e.text.slice(0, 120)));

  ws.close();
  chrome.kill();
  console.log('Cleaned up Chrome process.');
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
