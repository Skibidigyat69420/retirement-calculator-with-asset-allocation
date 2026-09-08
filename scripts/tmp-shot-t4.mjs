// TRACK 4: screenshot all routes of the running dev server for dark-theme review.
// Usage: node scripts/tmp-shot-t4.mjs [outdir] [--print-dossier]
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2] || '/tmp/t4';
mkdirSync(OUT, { recursive: true });

const ROUTES = [
  ['dashboard', '/'],
  ['risk', '/risk'],
  ['master-plan', '/master-plan'],
  ['goal', '/goal'],
  ['retirement', '/retirement'],
  ['reverse-planning', '/reverse-planning'],
  ['allocation', '/allocation'],
  ['advanced-portfolio', '/advanced-portfolio'],
  ['meeting-workflow', '/meeting-workflow'],
  ['decision-history', '/decision-history'],
  ['reports', '/reports'],
  ['dossier', '/dossier'],
  ['calculators', '/calculators'],
  ['ips', '/ips'],
  ['angel-connect', '/angel-connect'],
  ['angel-data', '/angel-data'],
];

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

const only = process.argv[3];
for (const [name, route] of ROUTES) {
  if (only && name !== only) continue;
  try {
    await page.goto('http://localhost:5173' + route, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise((r) => setTimeout(r, 2500));
    await page.screenshot({ path: `${OUT}/${name}.png` });
    console.log(`✔ ${name}`);
  } catch (e) {
    console.log(`✘ ${name}: ${e.message}`);
  }
}

if (process.argv.includes('--print-dossier')) {
  await page.emulateMediaType('print');
  await page.goto('http://localhost:5173/dossier', { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 2500));
  await page.screenshot({ path: `${OUT}/dossier-print.png` });
  console.log('✔ dossier-print');
}

await browser.close();
