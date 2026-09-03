import puppeteer from 'puppeteer';
import path from 'node:path';

const artifactDir = '/home/ketan/.gemini/antigravity-ide/brain/ff140aae-5ca2-4d2c-ab92-aea8ec3ceba2';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({ text: msg.text(), location: msg.location() });
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push({ text: err.message, stack: err.stack });
  });

  const routes = [
    { url: 'http://localhost:5173/', name: 'audit_dashboard.png' },
    { url: 'http://localhost:5173/retirement', name: 'audit_retirement.png' },
    { url: 'http://localhost:5173/allocation', name: 'audit_allocation.png' },
    { url: 'http://localhost:5173/goal', name: 'audit_goals.png' },
    { url: 'http://localhost:5173/mvo', name: 'audit_mvo.png' },
    { url: 'http://localhost:5173/risk', name: 'audit_risk.png' },
    { url: 'http://localhost:5173/reports', name: 'audit_reports.png' },
    { url: 'http://localhost:5173/calculators', name: 'audit_calculators.png' },
    { url: 'http://localhost:5173/dossier', name: 'audit_dossier.png' },
  ];

  for (const r of routes) {
    console.log(`Auditing ${r.url}...`);
    await page.goto(r.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => !document.querySelector('.animate-pulse'), { timeout: 15000 }).catch(() => {});
    await new Promise((res) => setTimeout(res, 1200));

    // Test interactivity on retirement page
    if (r.url.includes('/retirement')) {
      await page.evaluate(() => window.scrollTo(0, 1000));
      await new Promise((res) => setTimeout(res, 500));
    }

    const outPath = path.join(artifactDir, r.name);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`Saved screenshot: ${r.name}`);
  }

  await browser.close();

  console.log('\n--- AUDIT RESULTS ---');
  if (consoleErrors.length === 0) {
    console.log('✅ ZERO console or runtime errors detected across all 9 pages!');
  } else {
    console.warn(`⚠️ Detected ${consoleErrors.length} console error(s):`);
    consoleErrors.forEach((e) => console.warn(e));
  }
}

main().catch((err) => {
  console.error('Audit script failed:', err);
  process.exit(1);
});
