/** Browser regression for onboarding. All provider/API calls are intercepted;
 * no real Supabase accounts, invitations, or application database rows are used. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const port = 5199;
const origin = `http://127.0.0.1:${port}`;
const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/chromium',
].find(existsSync);
if (!executablePath) throw new Error('Set PUPPETEER_EXECUTABLE_PATH to a Chromium browser.');
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  windowsHide: true, stdio: 'pipe', env: { ...process.env, VITE_AUTH_MODE: 'supabase',
    VITE_SUPABASE_URL: 'https://onboarding.example.test', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_browser_test' },
});
let browser;
try {
  let started = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    if (server.exitCode !== null) throw new Error('Isolated Vite server could not start.');
    try { if ((await fetch(origin)).ok) { started = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.ok(started, 'Vite starts');
  browser = await puppeteer.launch({ executablePath, headless: true });
  async function scenario({ join = false, mobile = false } = {}) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport(mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 });
    let provisioned = false;
    let created = null;
    let accepted = null;
    let invitations = [];
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    const user = { id: '00000000-0000-4000-8000-000000000101', email: 'test@example.test', aud: 'authenticated',
      role: 'authenticated', email_confirmed_at: new Date().toISOString(), app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
    const token = [ { alg: 'HS256', typ: 'JWT' }, { sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 } ]
      .map(value => Buffer.from(JSON.stringify(value)).toString('base64url')).join('.') + '.test-signature';
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      const respond = (body, status = 200) => request.respond({ status, contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }, body: JSON.stringify(body) });
      if (url.hostname === 'onboarding.example.test') {
        if (request.method() === 'OPTIONS') return void respond({});
        if (url.pathname.endsWith('/token')) return void respond({ access_token: token, refresh_token: 'test-refresh', expires_in: 3600, token_type: 'bearer', user });
        if (url.pathname.endsWith('/user')) return void respond(user);
        return void respond({});
      }
      if (url.pathname.startsWith('/api/v1')) {
        if (url.pathname.endsWith('/auth/session')) return void respond(provisioned
          ? { user: { id: user.id, email: user.email, fullName: 'Test Owner' }, memberships: [{ organizationId: 'org-one', organizationName: 'Test Practice', role: join ? 'read_only' : 'practice_owner' }] }
          : { error: { code: 'ONBOARDING_REQUIRED', message: 'Setup required' } }, provisioned ? 200 : 403);
        if (url.pathname.endsWith('/onboarding/practice')) { created = JSON.parse(request.postData()); provisioned = true; return void respond({ organization: { id: 'org-one', name: 'Test Practice' } }); }
        if (url.pathname.endsWith('/invitations/accept')) { accepted = JSON.parse(request.postData()); provisioned = true; return void respond({ organization: { id: 'org-one', name: 'Test Practice' } }); }
        if (url.pathname.endsWith('/organizations/current/invitations')) {
          if (request.method() === 'POST') {
            invitations = [{ ...JSON.parse(request.postData()), id: 'invite-one', status: 'pending', expiresAt: new Date(Date.now() + 3600000).toISOString() }];
            return void respond({ ...invitations[0], token: 'test-invitation-code-1234567890' }, 201);
          }
          return void respond({ data: invitations });
        }
        if (url.pathname.endsWith('/revoke')) { invitations[0].status = 'revoked'; return void respond({ id: 'invite-one', status: 'revoked' }); }
        if (url.pathname.endsWith('/fx/rates')) return void respond({ base: 'INR', rates: { INR: 1 }, currencies: ['INR'], source: 'bundled-fallback', stale: true });
        return void respond({ data: [] });
      }
      if (url.origin === origin || url.protocol === 'data:') return void request.continue();
      return void request.abort();
    });
    const invitation = 'test-invitation-code-1234567890';
    await page.goto(join ? `${origin}/join-practice#invite=${invitation}` : `${origin}/login`);
    await page.waitForSelector('input[type=email]');
    await page.type('input[type=email]', user.email);
    await page.type('input[type=password]', 'test-password-123');
    await page.click('button[type=submit]');
    await page.waitForSelector('input[autocomplete=name]');
    await page.type('input[autocomplete=name]', 'Test Owner');
    if (join) assert.equal(await page.$eval('input[autocomplete=off]', el => el.value), invitation);
    else await page.type('input[autocomplete=organization]', 'Test Practice');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, 'Onboarding fits viewport');
    await page.click('button[type=submit]');
    await page.waitForSelector('.directory-page');
    if (join) assert.deepEqual(accepted, { fullName: 'Test Owner', token: invitation });
    else assert.deepEqual(created, { fullName: 'Test Owner', practiceName: 'Test Practice' });
    await page.reload();
    await page.waitForSelector('.directory-page');
    if (!join) {
      await page.goto(`${origin}/team`);
      await page.waitForSelector('input[type=email]');
      await page.type('input[type=email]', 'colleague@example.test');
      await page.click('button[type=submit]');
      await page.waitForSelector('input[aria-label="Invitation link"]');
      assert.ok((await page.$eval('input[aria-label="Invitation link"]', el => el.value)).includes('/join-practice#invite='));
      await page.locator('::-p-text(Revoke)').click();
      await page.waitForFunction(() => document.body.innerText.includes('revoked'));
    }
    assert.deepEqual(pageErrors, []);
    await context.close();
    console.log(join ? 'PASS: mobile invited-account login, acceptance and reload' : 'PASS: practice setup, reload, team invitation and revocation');
  }
  await scenario();
  await scenario({ join: true, mobile: true });
} finally {
  await browser?.close();
  server.kill();
}
