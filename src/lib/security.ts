import { NextResponse } from 'next/server';

// In-Memory sliding-window rate limit store
interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up stale IP records every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    rateLimitStore.forEach((record, key) => {
      record.timestamps = record.timestamps.filter(ts => now - ts < 300000); // keep last 5 min
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    });
  }, 300000);
}

/**
 * Extracts client IP from standard proxy headers
 */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}

/**
 * In-memory sliding window rate limiter
 */
export function checkRateLimit(
  req: Request,
  options: { limit: number; windowMs: number; keyPrefix?: string }
): { allowed: boolean; remaining: number; resetSeconds: number } {
  const ip = getClientIp(req);
  const key = `${options.keyPrefix || 'rl'}:${ip}`;
  const now = Date.now();
  const windowStart = now - options.windowMs;

  let record = rateLimitStore.get(key);
  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Filter timestamps within current sliding window
  record.timestamps = record.timestamps.filter(ts => ts > windowStart);

  if (record.timestamps.length >= options.limit) {
    const oldestTimestamp = record.timestamps[0];
    const resetSeconds = Math.ceil((oldestTimestamp + options.windowMs - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetSeconds: Math.max(1, resetSeconds)
    };
  }

  // Register current request
  record.timestamps.push(now);
  return {
    allowed: true,
    remaining: options.limit - record.timestamps.length,
    resetSeconds: Math.ceil(options.windowMs / 1000)
  };
}

/**
 * Generates standard RFC rate limit headers
 */
export function getRateLimitHeaders(
  limit: number,
  remaining: number,
  resetSeconds: number
): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(Math.max(0, remaining)),
    'X-RateLimit-Reset': String(resetSeconds),
  };
}

/**
 * Generates standard 429 Too Many Requests response with RFC rate limit headers
 */
export function rateLimitExceededResponse(
  resetSeconds: number,
  limit: number = 60
) {
  return NextResponse.json(
    {
      error: 'Trop de requêtes. Veuillez patienter avant de réessayer.',
      retryAfter: resetSeconds,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(resetSeconds),
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(resetSeconds),
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}

/**
 * Constant-time string comparison to mitigate timing attacks against secrets & signatures
 * Fully compatible with Edge Runtime, Node.js, and browser contexts without external dependencies.
 */
export function safeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  
  let result = 0;
  const maxLen = Math.max(a.length, b.length);

  for (let i = 0; i < maxLen; i++) {
    const codeA = i < a.length ? a.charCodeAt(i) : 0;
    const codeB = i < b.length ? b.charCodeAt(i) : 0;
    result |= (codeA ^ codeB);
  }

  return result === 0 && a.length === b.length;
}

import { getCorsHeaders, handleCorsPreflight, isOriginAllowed } from './cors';

// Re-export centralized CORS utilities
export { getCorsHeaders, handleCorsPreflight, isOriginAllowed };

/**
 * XSS and Script Injection Sanitizer
 * Strips HTML tags, script execution tokens, event attributes, and dangerous URI schemes.
 */
export function sanitizeXss(input?: string | null, maxLength: number = 500): string {
  if (!input) return '';
  let clean = String(input).trim().slice(0, maxLength);

  // 1. Remove dangerous script blocks
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // 2. Remove any HTML tags
  clean = clean.replace(/<[^>]*>/g, '');

  // 3. Remove javascript: or vbscript: or data: URIs
  clean = clean.replace(/(?:javascript|vbscript|data\s*:\s*text\/html):/gi, '');

  // 4. Remove inline event handlers (onerror=, onload=, onclick=, etc.)
  clean = clean.replace(/\bon\w+\s*=/gi, '');

  return clean.trim();
}

/**
 * Sanitizes email addresses
 */
export function sanitizeEmail(email?: string | null): string {
  if (!email) return '';
  const stripped = sanitizeXss(email, 100);
  return stripped.toLowerCase();
}

/**
 * Sanitizes general input strings against injection and extreme lengths
 */
export function sanitizeString(input?: string | null, maxLength: number = 255): string {
  return sanitizeXss(input, maxLength);
}

/**
 * Prototype Pollution Defense: Recursively strips __proto__, constructor, and prototype properties from objects.
 */
export function stripPrototypePollution<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => stripPrototypePollution(item)) as unknown as T;
  }

  const cleanObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj as Record<string, any>)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    cleanObj[key] = stripPrototypePollution(value);
  }

  return cleanObj as T;
}

/**
 * Content Security Policy Header generator
 */
export function buildContentSecurityPolicy(): string {
  const isDev = process.env.NODE_ENV !== 'production';

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `img-src 'self' data: blob: https://images.unsplash.com https://*.unsplash.com`,
    `font-src 'self' data: https://fonts.gstatic.com`,
    `connect-src 'self' https: wss: ${isDev ? 'ws:' : ''}`,
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  return directives.join('; ');
}

/**
 * Shielded error response that prevents leaking database/internal stack traces in production
 */
export function secureErrorResponse(
  error: any,
  fallbackMessage: string = 'Une erreur interne est survenue',
  status: number = 500
) {
  console.error('[SECURE API ERROR]:', error);
  const isDev = process.env.NODE_ENV !== 'production';
  return NextResponse.json(
    {
      error: fallbackMessage,
      ...(isDev && error?.message ? { debug: error.message } : {})
    },
    {
      status,
      headers: getCorsHeaders()
    }
  );
}
