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
  await page.setViewport({ width: 1440, height: 1000 });

  // 1. Dashboard expanded
  console.log('Auditing Dashboard detailed...');
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => !document.querySelector('.animate-pulse'), { timeout: 15000 }).catch(() => {});
  await new Promise((res) => setTimeout(res, 1200));

  // Click "View 7 Area Breakdown"
  const breakdownBtn = await page.$('button ::-p-text("View 7 Area Breakdown")');
  if (breakdownBtn) {
    await breakdownBtn.click();
    await new Promise((res) => setTimeout(res, 500));
  }

  // Click "Why?" on the first recommendation
  const whyBtn = await page.$('button ::-p-text("Why?")');
  if (whyBtn) {
    await whyBtn.click();
    await new Promise((res) => setTimeout(res, 500));
  }

  await page.screenshot({ path: path.join(artifactDir, 'audit_dashboard_detail.png'), fullPage: true });
  console.log('Saved audit_dashboard_detail.png');

  // 2. Retirement: Monte Carlo Failure Analysis & ScenarioLab
  console.log('Auditing Retirement ScenarioLab...');
  await page.goto('http://localhost:5173/retirement', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => !document.querySelector('.animate-pulse'), { timeout: 15000 }).catch(() => {});
  await new Promise((res) => setTimeout(res, 1200));
  await page.screenshot({ path: path.join(artifactDir, 'audit_retirement_scenarios.png'), fullPage: true });
  console.log('Saved audit_retirement_scenarios.png');

  // 3. Allocation: Plan vs Reality & Implementation Plan
  console.log('Auditing Allocation Transition Plan...');
  await page.goto('http://localhost:5173/allocation', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => !document.querySelector('.animate-pulse'), { timeout: 15000 }).catch(() => {});
  await new Promise((res) => setTimeout(res, 1200));
  await page.screenshot({ path: path.join(artifactDir, 'audit_allocation_transition.png'), fullPage: true });
  console.log('Saved audit_allocation_transition.png');

  // 4. Goals: Goal Conflict Matrix
  console.log('Auditing Goal Conflict Matrix...');
  await page.goto('http://localhost:5173/goal', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => !document.querySelector('.animate-pulse'), { timeout: 15000 }).catch(() => {});
  await new Promise((res) => setTimeout(res, 1200));
  await page.screenshot({ path: path.join(artifactDir, 'audit_goals_conflicts.png'), fullPage: true });
  console.log('Saved audit_goals_conflicts.png');

  await browser.close();
  console.log('Done auditing Adviser OS components!');
}

main().catch(console.error);
