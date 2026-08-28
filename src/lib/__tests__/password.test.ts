import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  needsRehash,
  validatePasswordStrength,
  BCRYPT_WORK_FACTOR,
} from '../password';

describe('hashPassword', () => {
  it('returns a bcrypt hash string', async () => {
    const hash = await hashPassword('SecurePass1');
    expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
  });

  it('produces a different hash each time (salted)', async () => {
    const hash1 = await hashPassword('SecurePass1');
    const hash2 = await hashPassword('SecurePass1');
    expect(hash1).not.toBe(hash2);
  });

  it('throws when given an empty password', async () => {
    await expect(hashPassword('')).rejects.toThrow();
  });
});

describe('verifyPassword', () => {
  it('returns true for a correct password', async () => {
    const hash = await hashPassword('CorrectPass1');
    const result = await verifyPassword('CorrectPass1', hash);
    expect(result).toBe(true);
  });

  it('returns false for a wrong password', async () => {
    const hash = await hashPassword('CorrectPass1');
    const result = await verifyPassword('WrongPass99', hash);
    expect(result).toBe(false);
  });

  it('returns false when hash is empty string', async () => {
    const result = await verifyPassword('anything', '');
    expect(result).toBe(false);
  });

  it('uses legacy plain-text fallback for non-bcrypt hashes', async () => {
    const result = await verifyPassword('legacypass', 'legacypass');
    expect(result).toBe(true);
  });
});

describe('needsRehash', () => {
  it('returns true for null/undefined hash', () => {
    expect(needsRehash(null)).toBe(true);
    expect(needsRehash(undefined)).toBe(true);
  });

  it('returns true for a plain-text (non-bcrypt) hash', () => {
    expect(needsRehash('plaintext_password')).toBe(true);
  });

  it('returns true for a bcrypt hash with low work factor (e.g. 10)', () => {
    // A bcrypt hash with 10 rounds
    const lowRoundHash = '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345';
    expect(needsRehash(lowRoundHash)).toBe(true);
  });

  it('returns false for a bcrypt hash with current work factor', async () => {
    const hash = await hashPassword('SecurePass1');
    expect(needsRehash(hash)).toBe(false);
  });
});

describe('validatePasswordStrength', () => {
  it('accepts a strong password', () => {
    const result = validatePasswordStrength('StrongPass1');
    expect(result.valid).toBe(true);
  });

  it('rejects a password that is too short', () => {
    const result = validatePasswordStrength('Abc1');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('8');
  });

  it('rejects a common password', () => {
    const result = validatePasswordStrength('password123');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('commun');
  });

  it('rejects a password with no uppercase letter', () => {
    const result = validatePasswordStrength('weakpass1');
    expect(result.valid).toBe(false);
  });

  it('rejects a password with no number', () => {
    const result = validatePasswordStrength('NoNumbersHere');
    expect(result.valid).toBe(false);
  });

  it('rejects a password exceeding 128 characters', () => {
    const result = validatePasswordStrength('A1' + 'a'.repeat(128));
    expect(result.valid).toBe(false);
  });
});
