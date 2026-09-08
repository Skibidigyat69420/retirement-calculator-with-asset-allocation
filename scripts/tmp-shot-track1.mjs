import puppeteer from 'puppeteer-core';

const routes = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
for (const route of routes) {
  await page.goto('http://localhost:5173' + route, { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise(r => setTimeout(r, 2500));
  const name = route === '/' ? 'home' : route.slice(1).replace(/\//g, '-');
  await page.screenshot({ path: `/tmp/track1-${name}.png` });
  console.log('shot', route);
}
await browser.close();
