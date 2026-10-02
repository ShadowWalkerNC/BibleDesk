import 'server-only';

import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scryptCallback);

// Node's scrypt defaults (N=2^14, r=8, p=1, 64-byte key) cost ~100ms per hash
// on commodity hardware — expensive for attackers, tolerable for login/signup.
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

export class PasswordError extends Error {
  status = 400;

  constructor(message: string) {
    super(message);
    this.name = 'PasswordError';
  }
}

export function validatePasswordStrength(password: string): void {
  if (typeof password !== 'string' || password.length < 8) {
    throw new PasswordError('Password must be at least 8 characters.');
  }
  if (password.length > 128) {
    throw new PasswordError('Password must be at most 128 characters.');
  }
}

/** Hashes a password into a `v1.<saltHex>.<hashHex>` envelope. */
export async function hashPassword(password: string): Promise<string> {
  validatePasswordStrength(password);
  const salt = randomBytes(SALT_LENGTH);
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `v1.${salt.toString('hex')}.${derived.toString('hex')}`;
}

/**
 * Verifies a password against a stored envelope.
 * Returns false (never throws) for malformed envelopes or mismatches.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    if (typeof password !== 'string' || typeof stored !== 'string') return false;
    const [version, saltHex, hashHex, extra] = stored.split('.');
    if (version !== 'v1' || !saltHex || !hashHex || extra) return false;
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    if (salt.length !== SALT_LENGTH || expected.length !== KEY_LENGTH) return false;
    const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
