import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync } from 'node:fs';

const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || [
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].find(existsSync);

mkdirSync('qa-screenshots-redesign', { recursive: true });

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
  console.log(`Navigating to http://localhost:4173${route.path}...`);
  await page.goto(`http://localhost:4173${route.path}`, { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({
    path: `qa-screenshots-redesign/${route.name}.png`,
  });
  console.log(`Saved qa-screenshots-redesign/${route.name}.png`);
}

// Dark theme
await page.evaluate(() => {
  document.documentElement.classList.add('dark');
  localStorage.setItem('theme', 'dark');
});
await page.goto('http://localhost:4173/master-plan', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 1200));
await page.screenshot({
  path: 'qa-screenshots-redesign/06-master-plan-dark.png',
});
console.log('Saved qa-screenshots-redesign/06-master-plan-dark.png');

await browser.close();
console.log('Finished capturing all screenshots!');
