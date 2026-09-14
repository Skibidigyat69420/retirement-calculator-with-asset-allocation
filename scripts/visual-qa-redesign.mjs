#!/usr/bin/env node
/* Visual QA: log in via demo advisor, then capture key routes in light + dark. */
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const PORT = 4173;
const BASE = `http://localhost:${PORT}`;
const CHROMIUM = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';
const OUT = path.join(process.cwd(), 'qa-screenshots-redesign');
const routes = ['/', '/dashboard', '/calculators', '/risk', '/master-plan', '/allocation', '/goal', '/retirement', '/advanced-portfolio', '/reports', '/ips'];
const themes = ['light', 'dark'];

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
await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });

// Seed a fake advisor session + theme before any app script runs.
await page.evaluateOnNewDocument((t) => {
  localStorage.setItem('soundthesis_theme', t);
  localStorage.setItem('stw.token', 'qa-token');
  localStorage.setItem('stw.user', JSON.stringify({ id: 'qa-user', email: 'qa@soundthesis.local', fullName: 'QA Advisor' }));
  localStorage.setItem('stw.memberships', JSON.stringify([{ organizationId: 'org-qa', organizationName: 'QA Wealth', role: 'ADVISER' }]));
  localStorage.setItem('stw.orgId', 'org-qa');
}, themes[0]);

for (const theme of themes) {
  await page.evaluateOnNewDocument((t) => {
    localStorage.setItem('soundthesis_theme', t);
  }, theme);

  for (const route of routes) {
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle2', timeout: 30000 });
      await wait(1400);
      const name = `${route === '/' ? 'home' : route.slice(1)}-${theme}.png`;
      await page.screenshot({ path: path.join(OUT, name) });
      console.log('ok', name);
    } catch (e) {
      console.log('FAIL', route, theme, e.message.split('\n')[0]);
    }
  }
}

await browser.close();
server.kill();
console.log('done');
process.exit(0);
