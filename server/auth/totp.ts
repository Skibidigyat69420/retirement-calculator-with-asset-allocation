/**
 * TOTP MFA via otpauth (RFC 6238). Secrets are generated server-side,
 * stored server-side, and are NEVER exposed through any API or log
 * (spec §201). Only the otpauth:// provisioning URI is shown to the
 * user once, during enrollment.
 */
import { Secret, TOTP } from 'otpauth';

const ISSUER = 'Sound Thesis Wealth';

export interface TotpSecretBundle {
  /** Base32 secret — store this, show it to no one. */
  secret: string;
  /** otpauth:// URI for authenticator-app QR rendering. */
  otpauthUrl: string;
}

export function generateTotpSecret(accountEmail: string): TotpSecretBundle {
  const secret = new Secret({ size: 20 });
  const totp = new TOTP({
    issuer: ISSUER,
    label: accountEmail,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });
  return { secret: secret.base32, otpauthUrl: totp.toString() };
}

/** Verify a 6-digit TOTP code against a base32 secret (±1 step window). */
export function verifyTotpToken(secretBase32: string, token: string, window = 1): boolean {
  if (!/^\d{6}$/.test(token)) return false;
  const totp = new TOTP({ secret: Secret.fromBase32(secretBase32) });
  const delta = totp.validate({ token, window });
  return delta !== null;
}

/** Generate a current code — test helper only. */
export function generateTotpTokenForTest(secretBase32: string): string {
  return new TOTP({ secret: Secret.fromBase32(secretBase32) }).generate();
}
