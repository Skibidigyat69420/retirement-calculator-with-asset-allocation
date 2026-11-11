import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const PREFIX = 'stwenc:v1';

type EncryptedJson = { __stwEncrypted: 'v1'; iv: string; tag: string; ciphertext: string };

function decodeKey(raw: string): Buffer {
  const value = raw.trim();
  const key = /^[0-9a-f]{64}$/i.test(value) ? Buffer.from(value, 'hex') : Buffer.from(value, 'base64');
  if (key.length !== 32) throw new Error('FIELD_ENCRYPTION_KEY must be a 32-byte key encoded as 64 hexadecimal characters or base64.');
  return key;
}

export class FieldCipher {
  private readonly key: Buffer;

  constructor(rawKey: string) {
    this.key = decodeKey(rawKey);
  }

  encryptString(value: string | null): string | null {
    if (value === null) return null;
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return `${PREFIX}:${iv.toString('base64url')}:${cipher.getAuthTag().toString('base64url')}:${ciphertext.toString('base64url')}`;
  }

  decryptString(value: string | null | undefined): string | null {
    if (value === null || value === undefined) return null;
    if (!value.startsWith(`${PREFIX}:`)) return value;
    const [, , ivText, tagText, ciphertextText] = value.split(':');
    if (!ivText || !tagText || !ciphertextText) throw new Error('Encrypted field has an invalid envelope.');
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivText, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(ciphertextText, 'base64url')), decipher.final()]).toString('utf8');
  }

  encryptJson(value: Record<string, unknown>): EncryptedJson {
    const envelope = this.encryptString(JSON.stringify(value))!;
    const [, , iv, tag, ciphertext] = envelope.split(':');
    return { __stwEncrypted: 'v1', iv: iv!, tag: tag!, ciphertext: ciphertext! };
  }

  decryptJson(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || (value as Partial<EncryptedJson>).__stwEncrypted !== 'v1') {
      return (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
    }
    const envelope = value as EncryptedJson;
    const text = this.decryptString(`${PREFIX}:${envelope.iv}:${envelope.tag}:${envelope.ciphertext}`);
    return text ? JSON.parse(text) as Record<string, unknown> : {};
  }
}

export function createFieldCipher(): FieldCipher | null {
  const value = process.env.FIELD_ENCRYPTION_KEY?.trim();
  if (!value) return null;
  return new FieldCipher(value);
}
