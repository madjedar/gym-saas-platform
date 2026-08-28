import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

/**
 * Parses configured allowed origins from environment variable ALLOWED_ORIGINS (comma-separated).
 */
function getConfiguredOrigins(): string[] {
  const envOrigins = env.ALLOWED_ORIGINS || '';
  return envOrigins
    .split(',')
    .map((o) => o.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Checks if a given origin is allowed to make cross-origin requests.
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) {
    // Non-browser clients (native mobile apps, curl, server-to-server) have no origin
    return true;
  }

  const normalizedOrigin = origin.trim().toLowerCase();

  // 1. Check custom configured production domains (e.g. https://gymos.dz, https://admin.gymos.dz)
  const configuredOrigins = getConfiguredOrigins();
  if (configuredOrigins.includes(normalizedOrigin)) {
    return true;
  }

  // 2. Allow standard local development and mobile bundler origins
  const devOriginPatterns = [
    /^http:\/\/localhost(:\d+)?$/,
    /^http:\/\/127\.0\.0\.1(:\d+)?$/,
    /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/,
    /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/,
  ];

  if (process.env.NODE_ENV !== 'production' || configuredOrigins.length === 0) {
    for (const pattern of devOriginPatterns) {
      if (pattern.test(normalizedOrigin)) {
        return true;
      }
    }
  }

  // 3. Allow Native Mobile & Hybrid Webview schemes
  const mobileSchemes = ['capacitor://', 'ionic://', 'exp://', 'http://localhost'];
  for (const scheme of mobileSchemes) {
    if (normalizedOrigin.startsWith(scheme)) {
      return true;
    }
  }

  return false;
}

/**
 * Builds comprehensive, secure CORS response headers.
 */
export function getCorsHeaders(
  reqOrOrigin?: Request | string | null,
  methods: string = 'GET, POST, PUT, DELETE, PATCH, OPTIONS'
): Record<string, string> {
  let origin: string | null = null;

  if (reqOrOrigin) {
    if (typeof reqOrOrigin === 'string') {
      origin = reqOrOrigin;
    } else if ('headers' in reqOrOrigin && typeof reqOrOrigin.headers.get === 'function') {
      origin = reqOrOrigin.headers.get('origin');
    }
  }

  const isAllowed = isOriginAllowed(origin);
  const allowOrigin = isAllowed && origin ? origin : '*';

  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Requested-With, X-Webhook-Signature, Accept, Origin',
    'Access-Control-Expose-Headers':
      'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After, Content-Length, Content-Disposition',
    'Access-Control-Max-Age': '86400', // 24 hours preflight cache
  };

  // Credentials can only be enabled if origin is not a generic wildcard
  if (allowOrigin !== '*') {
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers['Vary'] = 'Origin';
  }

  return headers;
}

/**
 * Handles CORS preflight OPTIONS requests at the Edge or route level.
 */
export function handleCorsPreflight(
  reqOrOrigin?: Request | string | null,
  methods: string = 'GET, POST, PUT, DELETE, PATCH, OPTIONS'
): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(reqOrOrigin, methods),
  });
}
