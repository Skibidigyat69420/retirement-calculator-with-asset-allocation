#!/usr/bin/env node
/**
 * End-to-end verification of the Docker stack at http://localhost
 *  1. No boot/loading screen in the served bundle
 *  2. Stale token does NOT cause a reload loop (the old 401 → location.href bug)
 *  3. Demo login works same-origin and lands in the redesigned app
 */
import puppeteer from 'puppeteer-core';

const BASE = process.env.STACK_URL || 'http://localhost';
const CHROMIUM = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failures += 1;
};

const browser = await puppeteer.launch({
  executablePath: CHROMIUM,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
});

// -- 1. boot screen gone from the served bundle -----------------------------
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
const html = await (await fetch(`${BASE}/`)).text();
check(!html.includes('Loading your workspace'), 'served HTML has no boot screen');

// Count real page loads via a marker that persists across document loads.
await page.evaluateOnNewDocument(() => {
  sessionStorage.setItem('__load_count', String(Number(sessionStorage.getItem('__load_count') || 0) + 1));
});

// -- 2. stale token must not reload-loop ------------------------------------
await page.evaluateOnNewDocument(() => {
  localStorage.setItem('stw.token', 'stale-token-from-old-container');
  localStorage.setItem('stw.user', JSON.stringify({ id: 'u', email: 'a@b.c', fullName: 'Stale' }));
  localStorage.setItem('stw.memberships', JSON.stringify([{ organizationId: 'o', organizationName: 'O', role: 'ADVISER' }]));
  localStorage.setItem('stw.orgId', 'o');
});
await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 30000 });
await wait(6000); // the old bug reloaded every second or two
const loads = await page.evaluate(() => Number(sessionStorage.getItem('__load_count') || 0));
check(loads === 1, `no reload loop with stale token (${loads} page load(s) in 6s)`);
const tokenAfter = await page.evaluate(() => localStorage.getItem('stw.token'));
check(tokenAfter === null, 'stale token cleared after 401');

// -- 3. demo login through the running stack --------------------------------
await page.evaluateOnNewDocument(() => {
  localStorage.clear();
});
await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 30000 });
await wait(1200);
const hasDemo = !!(await page.$('.demo-advisor-list button'));
check(hasDemo, 'demo advisor list rendered (backend reachable, seed present)');
if (hasDemo) {
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v1/') && r.request().method() === 'POST', { timeout: 15000 }).catch(() => null),
    page.click('.demo-advisor-list button'),
  ]);
  check(resp !== null && resp.ok(), `dev login API call succeeded (${resp?.status()})`);
  await wait(3500);
  const loadsAfterLogin = await page.evaluate(() => Number(sessionStorage.getItem('__load_count') || 0));
  check(loadsAfterLogin <= 2, `no reload loop after login (${loadsAfterLogin} load(s))`);
  const appVisible = await page.evaluate(() => !!document.querySelector('main') && !document.querySelector('.auth-page'));
  check(appVisible, 'landed inside the app (not the auth gate)');
  await page.screenshot({ path: 'qa-screenshots-redesign/docker-stack-verified.png' });
}

await browser.close();
console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
