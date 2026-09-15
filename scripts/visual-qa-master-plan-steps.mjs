#!/usr/bin/env node
/* Visual QA: capture each master-plan wizard step at 1440px in light mode. */
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const PORT = 4173;
const BASE = `http://localhost:${PORT}`;
const CHROMIUM = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';
const OUT = path.join(process.cwd(), 'docs', 'qa-screenshots-redesign');
const steps = ['profile', 'financials', 'cashflows', 'goals', 'risk', 'assumptions', 'results'];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const server = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'], {
  cwd: process.cwd(),
  stdio: 'ignore',
});
process.on('exit', () => server.kill());

await wait(2500);
await mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROMIUM,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-color-profile=srgb', '--font-render-hinting=none', '--hide-scrollbars'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

// Seed a fake advisor session + light theme before any app script runs.
await page.evaluateOnNewDocument(() => {
  localStorage.setItem('soundthesis_theme', 'light');
  localStorage.setItem('stw.token', 'qa-token');
  localStorage.setItem('stw.user', JSON.stringify({ id: 'qa-user', email: 'qa@soundthesis.local', fullName: 'QA Advisor' }));
  localStorage.setItem('stw.memberships', JSON.stringify([{ organizationId: 'org-qa', organizationName: 'QA Wealth', role: 'ADVISER' }]));
  localStorage.setItem('stw.orgId', 'org-qa');
});

for (const step of steps) {
  try {
    await page.goto(`${BASE}/master-plan?step=${step}`, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(1400);
    // Seed a sample persona once so steps render with real data.
    if (step === steps[0]) {
      await page.click('button[aria-label="Sample workspaces"]').catch(() => {});
      await wait(400);
      await page.evaluate(() => {
        const item = [...document.querySelectorAll('[role="menuitem"]')].find((el) =>
          el.textContent?.includes('Sharma Family'),
        );
        if (item instanceof HTMLElement) item.click();
      });
      await wait(1200);
    }
    const name = `master-plan-${step}-light-1440.png`;
    await page.screenshot({ path: path.join(OUT, name) });
    console.log('ok', name);
  } catch (e) {
    console.log('FAIL', step, e.message.split('\n')[0]);
  }
}

await browser.close();
server.kill();
console.log('done');
process.exit(0);
