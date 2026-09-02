#!/usr/bin/env node
/**
 * Headless final QA harness.
 *
 * - Starts the Vite dev server
 * - Visits every client route at three viewport sizes
 * - Captures console errors / page errors
 * - Checks for horizontal overflow
 * - Runs an accessibility scan with @axe-core/puppeteer
 * - Captures a screenshot for any route/viewport that fails
 * - Writes a JUnit-compatible XML report to qa-results.xml
 * - Exits non-zero only for navigation errors, overflows, console/page errors,
 *   or critical accessibility violations
 */
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { AxePuppeteer } from '@axe-core/puppeteer';

const PORT = 5173;
const BASE_URL = `http://localhost:${PORT}`;
const CHROMIUM = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';
const SCREENSHOT_DIR = path.join(process.cwd(), 'qa-screenshots');
const JUNIT_PATH = path.join(process.cwd(), 'qa-results.xml');

const require = createRequire(import.meta.url);
const AXE_CORE_PATH = require.resolve('axe-core');
const AXE_CORE_SOURCE = await readFile(AXE_CORE_PATH, 'utf8');

const routes = [
  '/',
  '/risk',
  '/master-plan',
  '/goal',
  '/retirement',
  '/allocation',
  '/mvo',
  '/reports',
  '/calculators',
  '/ips',
  '/angel-connect',
  '/angel-data',
];

const viewports = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await wait(250);
  }
  throw new Error(`Server at ${url} did not become ready within ${timeout}ms`);
}

async function startDevServer() {
  // Make sure a previous dev-server instance is not holding the port.
  try {
    const { execSync } = await import('node:child_process');
    execSync('fuser -k 5173/tcp 2>/dev/null || true', { stdio: 'ignore' });
    await wait(500);
  } catch {
    // ignore
  }

  // Spawn Vite directly so the child PID is the server and can be killed cleanly.
  const child = spawn('node', ['node_modules/.bin/vite', '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  });

  child.stdout.on('data', () => {
    // Uncomment for local debugging:
    // process.stdout.write(data);
  });
  child.stderr.on('data', () => {
    // process.stderr.write(data);
  });

  try {
    await waitForServer(`${BASE_URL}/`, 30000);
  } catch (err) {
    killServer(child);
    throw err;
  }

  return child;
}

function killServer(child) {
  if (!child) return;
  try {
    child.kill('SIGTERM');
  } catch {
    // ignore
  }
}

function sanitizeFilename(route, viewport) {
  const routePart = route === '/' ? 'index' : route.replace(/[^a-zA-Z0-9]/g, '_').replace(/^_|_$/g, '');
  return `${routePart}-${viewport}.png`;
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatAxeViolation(violation) {
  const nodes = violation.nodes
    .map((node) => `    - ${node.target.join(' ')}
      ${node.failureSummary?.split('\n').join('\n      ') || ''}`)
    .join('\n');
  return `[${violation.impact}] ${violation.help} (${violation.id})
${nodes}`;
}

function generateJUnit(results, durationMs) {
  const total = results.length;
  const failures = results.filter((r) => r.failed).length;
  const time = (durationMs / 1000).toFixed(3);

  const testcases = results
    .map((r) => {
      const name = `${r.route} @ ${r.viewport}`;
      const timeSec = ((r.durationMs || 0) / 1000).toFixed(3);
      const systemOutLines = [];

      if (r.consoleWarnings.length) {
        systemOutLines.push('Console warnings:');
        for (const e of r.consoleWarnings) systemOutLines.push(`  [${e.type}] ${e.text}`);
      }
      if (r.consoleErrors.length) {
        systemOutLines.push('Console errors:');
        for (const e of r.consoleErrors) systemOutLines.push(`  [${e.type}] ${e.text}`);
      }
      if (r.pageErrors.length) {
        systemOutLines.push('Page errors:');
        for (const e of r.pageErrors) systemOutLines.push(`  ${e}`);
      }
      if (r.axeViolations.length) {
        systemOutLines.push('Accessibility violations:');
        for (const v of r.axeViolations) systemOutLines.push(formatAxeViolation(v));
      }

      const systemOut = systemOutLines.length
        ? `\n    <system-out>${escapeXml(systemOutLines.join('\n'))}</system-out>`
        : '';

      if (!r.failed) {
        return `    <testcase name="${escapeXml(name)}" classname="qa.route" time="${timeSec}">${systemOut}
    </testcase>`;
      }

      const failureLines = [];
      if (r.status !== 'ok') failureLines.push(`navigation: ${r.status} - ${r.error || ''}`);
      if (r.overflow) failureLines.push('horizontal overflow detected');
      if (r.consoleErrors.length) failureLines.push(`${r.consoleErrors.length} console error(s)`);
      if (r.pageErrors.length) failureLines.push(`${r.pageErrors.length} page error(s)`);
      if (r.criticalAxeViolations.length) {
        failureLines.push(`${r.criticalAxeViolations.length} critical accessibility violation(s)`);
      }

      const failureMessage = failureLines.join('; ');
      const failureBody = failureLines.map((line) => `- ${line}`).join('\n');

      return `    <testcase name="${escapeXml(name)}" classname="qa.route" time="${timeSec}">
      <failure message="${escapeXml(failureMessage)}">${escapeXml(failureBody)}</failure>${systemOut}
    </testcase>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="Headless QA" tests="${total}" failures="${failures}" errors="0" time="${time}">
${testcases}
  </testsuite>
</testsuites>
`;
}

async function run() {
  const startTime = Date.now();
  const server = await startDevServer();
  let browser;
  const results = [];

  try {
    await mkdir(SCREENSHOT_DIR, { recursive: true });

    browser = await puppeteer.launch({
      executablePath: CHROMIUM,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    for (const route of routes) {
      for (const vp of viewports) {
        const caseStart = Date.now();
        const page = await browser.newPage();
        await page.setViewport({ width: vp.width, height: vp.height });

        const consoleEntries = [];
        const pageErrorEntries = [];

        page.on('console', (msg) => {
          const type = msg.type();
          if (type === 'error' || type === 'warning') {
            consoleEntries.push({ type, text: msg.text() });
          }
        });
        page.on('pageerror', (err) => {
          pageErrorEntries.push(err.message);
        });

        const url = `${BASE_URL}${route}`;
        let status = 'ok';
        let error;
        let overflow = false;
        let axeViolations = [];
        let screenshotPath = null;

        try {
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
          // Allow Framer Motion / charts / data fetches to settle.
          await wait(1200);

          overflow = await page.evaluate(() => {
            return document.documentElement.scrollWidth > window.innerWidth + 1;
          });

          const axeResults = await new AxePuppeteer(page, AXE_CORE_SOURCE)
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();
          axeViolations = axeResults.violations || [];
        } catch (err) {
          status = 'navigation-error';
          error = err.message;
        }

        const consoleErrors = consoleEntries.filter((e) => e.type === 'error');
        const consoleWarnings = consoleEntries.filter((e) => e.type === 'warning');
        const criticalAxeViolations = axeViolations.filter((v) => v.impact === 'critical');

        const failed =
          status !== 'ok' ||
          overflow ||
          consoleErrors.length > 0 ||
          pageErrorEntries.length > 0 ||
          criticalAxeViolations.length > 0;

        if (failed) {
          screenshotPath = path.join(SCREENSHOT_DIR, sanitizeFilename(route, vp.name));
          try {
            await page.screenshot({ path: screenshotPath, fullPage: true });
          } catch (shotErr) {
            screenshotPath = `screenshot-failed: ${shotErr.message}`;
          }
        }

        results.push({
          route,
          viewport: vp.name,
          url,
          status,
          error,
          overflow,
          consoleErrors,
          consoleWarnings,
          pageErrors: pageErrorEntries,
          axeViolations,
          criticalAxeViolations,
          screenshotPath,
          failed,
          durationMs: Date.now() - caseStart,
        });

        await page.close();
      }
    }
  } finally {
    if (browser) await browser.close();
    killServer(server);
  }

  // Write JUnit report
  const durationMs = Date.now() - startTime;
  const junitXml = generateJUnit(results, durationMs);
  await writeFile(JUNIT_PATH, junitXml, 'utf8');

  // Console report
  console.log('\n=== Headless QA Report ===\n');
  for (const r of results) {
    const issues = [
      r.status !== 'ok' ? `nav:${r.status} ${r.error || ''}` : null,
      r.overflow ? 'horizontal-overflow' : null,
      r.consoleErrors.length ? `${r.consoleErrors.length} console error(s)` : null,
      r.consoleWarnings.length ? `${r.consoleWarnings.length} console warning(s)` : null,
      r.pageErrors.length ? `${r.pageErrors.length} page error(s)` : null,
      r.criticalAxeViolations.length
        ? `${r.criticalAxeViolations.length} critical a11y violation(s)`
        : null,
      r.axeViolations.length - r.criticalAxeViolations.length > 0
        ? `${r.axeViolations.length - r.criticalAxeViolations.length} non-critical a11y violation(s)`
        : null,
    ].filter(Boolean);

    const marker = issues.length ? '✗' : '✓';
    console.log(`${marker} ${r.route.padEnd(16)} ${r.viewport.padEnd(7)} ${issues.join(' | ') || 'clean'}`);

    if (r.screenshotPath && !String(r.screenshotPath).startsWith('screenshot-failed')) {
      console.log(`    screenshot: ${r.screenshotPath}`);
    }
    if (r.consoleErrors.length) {
      for (const e of r.consoleErrors) {
        console.log(`    [console.error] ${e.text}`);
      }
    }
    if (r.pageErrors.length) {
      for (const e of r.pageErrors) {
        console.log(`    [pageerror] ${e}`);
      }
    }
    if (r.axeViolations.length) {
      for (const v of r.axeViolations) {
        console.log(`    [a11y:${v.impact}] ${v.help} (${v.id})`);
      }
    }
  }

  const total = results.length;
  const clean = results.filter((r) => !r.failed).length;

  console.log(`\n${clean}/${total} route/viewport combinations passed.`);
  console.log(`JUnit report written to ${JUNIT_PATH}`);

  const anyFailed = results.some((r) => r.failed);
  if (anyFailed) {
    console.log('\nQA failed: console errors, page errors, horizontal overflow, or critical accessibility violations detected.');
    process.exitCode = 1;
    return;
  }

  console.log('\nQA passed.');
}

run().catch((err) => {
  console.error('Unexpected QA failure:', err);
  process.exitCode = 1;
});
