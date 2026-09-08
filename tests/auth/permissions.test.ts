import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  canInviteRole,
  roleAtLeast,
  roleCan,
} from '../../server/auth/permissions.js';
import {
  SESSION_COOKIE_NAME,
  buildClearSessionCookie,
  buildSessionCookie,
} from '../../server/auth/session.js';

test('role permission matrix: owners/admins can manage team, practitioners cannot', () => {
  assert.equal(roleCan('practice_owner', 'org.members.manage'), true);
  assert.equal(roleCan('practice_admin', 'org.members.invite'), true);
  assert.equal(roleCan('wealth_practitioner', 'org.members.manage'), false);
  assert.equal(roleCan('associate', 'reports.export'), false);
  assert.equal(roleCan('read_only', 'clients.edit'), false);
  assert.equal(roleCan('read_only', 'clients.view'), true);
});

test('permanent client deletion is restricted to practice_owner', () => {
  assert.equal(roleCan('practice_owner', 'clients.delete'), true);
  assert.equal(roleCan('practice_admin', 'clients.delete'), false);
});

test('platform_admin has no implicit practice privileges', () => {
  assert.equal(roleAtLeast('platform_admin', 'practice_admin'), false);
  assert.equal(canInviteRole('platform_admin', 'read_only'), true);
});

test('admins cannot invite peers or superiors; owners can invite any practice role', () => {
  assert.equal(canInviteRole('practice_admin', 'practice_admin'), false);
  assert.equal(canInviteRole('practice_admin', 'practice_owner'), false);
  assert.equal(canInviteRole('practice_admin', 'associate'), true);
  assert.equal(canInviteRole('practice_owner', 'practice_admin'), true);
  assert.equal(canInviteRole('wealth_practitioner', 'read_only'), false);
  assert.equal(canInviteRole('practice_owner', 'platform_admin'), false);
});

test('session cookie contract: httpOnly, sameSite=lax, path=/, secure in prod', () => {
  const prod = buildSessionCookie('tok', { secure: true });
  assert.ok(prod.startsWith(`${SESSION_COOKIE_NAME}=tok;`));
  assert.ok(prod.includes('HttpOnly'));
  assert.ok(prod.includes('SameSite=Lax'));
  assert.ok(prod.includes('Path=/'));
  assert.ok(prod.includes('Secure'));
  const dev = buildSessionCookie('tok', { secure: false });
  assert.ok(!dev.includes('Secure'));
});

test('clear-cookie expires the session cookie immediately', () => {
  const cleared = buildClearSessionCookie();
  assert.ok(cleared.startsWith(`${SESSION_COOKIE_NAME}=;`));
  assert.ok(cleared.includes('Max-Age=0'));
});
