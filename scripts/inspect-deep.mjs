import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer-core';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const server = spawn('npm', ['run', 'preview', '--', '--port', '4174', '--strictPort'], { cwd: process.cwd(), stdio: 'ignore' });
process.on('exit', () => server.kill());
await wait(2500);
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
for (const theme of ['light', 'dark']) {
  await page.evaluateOnNewDocument((t) => {
    localStorage.setItem('soundthesis_theme', t);
    localStorage.setItem('stw.token', 'qa-token');
    localStorage.setItem('stw.user', JSON.stringify({ id: 'q', email: 'q@q.q', fullName: 'Q' }));
    localStorage.setItem('stw.memberships', JSON.stringify([{ organizationId: 'o', organizationName: 'O', role: 'A' }]));
    localStorage.setItem('stw.orgId', 'o');
  }, theme);
  await page.goto('http://localhost:4174/allocation', { waitUntil: 'networkidle2' });
  await wait(1000);
  const info = await page.evaluate(() => {
    const tab = document.querySelector('[role="tab"][aria-selected="true"]');
    if (!tab) return null;
    const cs = getComputedStyle(tab);
    const cs2 = getComputedStyle(document.querySelector('.brand-rail') ?? document.body);
    return { tabBg: cs.backgroundColor, tabColor: cs.color, railBg: cs2.backgroundColor, deepVar: getComputedStyle(document.documentElement).getPropertyValue('--color-deep') };
  });
  console.log(theme, JSON.stringify(info));
  await page.evaluateOnNewDocument(() => {}); // no-op
}
await browser.close(); server.kill(); process.exit(0);
