/**
 * lib/crypto/pii.js
 * AES-256-GCM encryption for PII fields.
 *
 * ENCRYPTION_KEY env: 64-char hex string (32 bytes).
 * Output format: base64-encoded JSON { iv, tag, ct }
 *
 * Never log plaintext values. Encryption is deterministic per call
 * (random IV each time), so ciphertext differs per encrypt() call.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';

function getKey() {
  const hex = process.env.ENCRYPTION_KEY ?? '';
  if (hex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-char hex string (32 bytes). Generate with: openssl rand -hex 32');
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypt a plaintext string.
 * Returns a base64-encoded JSON string: { iv, tag, ct }
 */
export function encrypt(plaintext) {
  if (plaintext == null) return null;
  const key = getKey();
  const iv  = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv(ALGO, key, iv);
  const ct  = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.from(JSON.stringify({
    iv:  iv.toString('base64'),
    tag: tag.toString('base64'),
    ct:  ct.toString('base64'),
  })).toString('base64');
}

/**
 * Decrypt a value produced by encrypt().
 * Returns the original plaintext string, or null on failure.
 */
export function decrypt(encryptedBase64) {
  if (!encryptedBase64) return null;
  try {
    const { iv, tag, ct } = JSON.parse(Buffer.from(encryptedBase64, 'base64').toString('utf8'));
    const key     = getKey();
    const decipher = createDecipheriv(ALGO, key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(ct, 'base64')),
      decipher.final(),
    ]);
    return plain.toString('utf8');
  } catch {
    return null; // wrong key or corrupted data
  }
}
