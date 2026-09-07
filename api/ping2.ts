import { jsonResponse } from './lib/shared.js';

export default function handler() {
  return jsonResponse({ ok: true, sharedImport: 'works' });
}
