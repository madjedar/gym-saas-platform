/**
 * Centralized Data Transfer Object (DTO) & Sanitization Module
 * Protects against OWASP API3:2023 Excessive Data Exposure by stripping password hashes,
 * tokens, and internal metadata before data reaches clients or React Server Components.
 */

export const SAFE_USER_SELECT = {
  id: true,
  gymId: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  avatarUrl: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type SafeUser = {
  id: string;
  gymId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  avatarUrl?: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Transforms a User database model into a SafeUser DTO, stripping passwordHash.
 */
export function toSafeUser<T extends Record<string, any>>(user: T): Omit<T, 'passwordHash'> {
  if (!user) return user;
  const { passwordHash, ...safeUser } = user;
  return safeUser as Omit<T, 'passwordHash'>;
}

/**
 * Generic recursive sanitizer that removes sensitive properties from arbitrary objects/arrays.
 */
export function excludeSensitive<T>(data: T, sensitiveKeys: string[] = ['passwordHash', 'password', 'token', 'secret']): T {
  if (data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    return data.map((item) => excludeSensitive(item, sensitiveKeys)) as unknown as T;
  }

  if (typeof data === 'object' && !(data instanceof Date)) {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (sensitiveKeys.includes(key)) {
        continue;
      }
      clean[key] = excludeSensitive(value, sensitiveKeys);
    }
    return clean as T;
  }

  return data;
}
