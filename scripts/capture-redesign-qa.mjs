import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const port = 4173;
const origin = `http://127.0.0.1:${port}`;
const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || [
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].find(existsSync);

if (!executablePath) {
  console.error('No Chromium executable found.');
  process.exit(1);
}

mkdirSync('qa-screenshots-redesign', { recursive: true });

// Start vite preview
const preview = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], {
  stdio: 'pipe',
});

let started = false;
for (let i = 0; i < 40; i++) {
  try {
    const res = await fetch(origin);
    if (res.ok) {
      started = true;
      break;
    }
  } catch {}
  await new Promise((r) => setTimeout(r, 250));
}

if (!started) {
  console.error('Failed to start preview server.');
  preview.kill();
  process.exit(1);
}

console.log('Preview server ready on', origin);

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 960 });

const routes = [
  { path: '/', name: '01-clients-directory' },
  { path: '/overview', name: '02-executive-dashboard' },
  { path: '/master-plan', name: '03-master-plan' },
  { path: '/calculators', name: '04-calculators' },
  { path: '/ips', name: '05-ips-studio' },
];

for (const route of routes) {
  console.log(`Capturing ${route.path}...`);
  await page.goto(`${origin}${route.path}`, { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise((r) => setTimeout(r, 800)); // allow framer-motion animations
  await page.screenshot({
    path: `qa-screenshots-redesign/${route.name}.png`,
    fullPage: false,
  });
}

// Test switching to dark theme
console.log('Capturing dark theme...');
await page.evaluate(() => {
  document.documentElement.classList.add('dark');
  localStorage.setItem('theme', 'dark');
});
await page.goto(`${origin}/master-plan`, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({
  path: `qa-screenshots-redesign/06-master-plan-dark.png`,
  fullPage: false,
});

await browser.close();
preview.kill();
console.log('All QA screenshots captured successfully in qa-screenshots-redesign/');
