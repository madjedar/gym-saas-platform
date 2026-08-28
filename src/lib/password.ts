import bcrypt from 'bcryptjs';

// OWASP Recommended Salt Rounds Work Factor
export const BCRYPT_WORK_FACTOR = 12;

// Common trivial / insecure passwords to disallow
const COMMON_PASSWORDS = new Set([
  'password',
  'password123',
  '123456',
  '12345678',
  '123456789',
  'qwerty',
  'admin123',
  'admin1234',
  'gympass123',
  'welcome123',
]);

/**
 * Hashes a plaintext password using bcrypt with standard OWASP work factor (12 rounds).
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || typeof password !== 'string') {
    throw new Error('Mot de passe manquant ou invalide');
  }

  // Bcrypt has a maximum input length limit of 72 bytes
  const trimmed = password.slice(0, 128);
  return bcrypt.hash(trimmed, BCRYPT_WORK_FACTOR);
}

/**
 * Verifies a plaintext password against a stored bcrypt hash (or legacy seed fallback).
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!password || !storedHash) return false;

  const isBcrypt =
    storedHash.startsWith('$2a$') ||
    storedHash.startsWith('$2b$') ||
    storedHash.startsWith('$2y$');

  if (isBcrypt) {
    try {
      return await bcrypt.compare(password, storedHash);
    } catch {
      return false;
    }
  }

  // Legacy fallback for plain seed passwords
  return password === storedHash;
}

/**
 * Checks if a stored password hash requires transparent upgrading/rehashing.
 * Returns true if the password is plain text or used a work factor less than 12.
 */
export function needsRehash(storedHash?: string | null): boolean {
  if (!storedHash) return true;

  const isBcrypt =
    storedHash.startsWith('$2a$') ||
    storedHash.startsWith('$2b$') ||
    storedHash.startsWith('$2y$');

  if (!isBcrypt) return true;

  // Extract bcrypt cost/round factor: format is $2b$10$...
  const parts = storedHash.split('$');
  if (parts.length >= 3) {
    const rounds = parseInt(parts[2], 10);
    if (!isNaN(rounds) && rounds < BCRYPT_WORK_FACTOR) {
      return true;
    }
  }

  return false;
}

/**
 * Validates password complexity and entropy rules.
 */
export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Le mot de passe doit comporter au moins 8 caractères' };
  }

  if (password.length > 128) {
    return { valid: false, message: 'Le mot de passe ne peut pas dépasser 128 caractères' };
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return { valid: false, message: 'Ce mot de passe est trop commun et facile à deviner' };
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasUpper || !hasLower || !hasNumber) {
    return {
      valid: false,
      message: 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre',
    };
  }

  return { valid: true };
}
