import jwt, { JwtPayload, SignOptions, VerifyOptions } from 'jsonwebtoken';
import { env } from '@/lib/env';

// Configuration constants
const AUTH_SECRET = env.NEXTAUTH_SECRET;
const QR_SECRET = env.JWT_SECRET;

const ISSUER = 'gymos-platform';
const AUDIENCE_MOBILE = 'gymos-mobile';
const AUDIENCE_SCANNER = 'gymos-scanner';

export interface MobileSessionPayload {
  userId: string;
  gymId: string;
  email: string;
  role: string;
}

export interface MobileSessionTokenClaims extends JwtPayload, MobileSessionPayload {
  typ: 'SESSION';
}

export interface QrPassPayload {
  userId: string;
  gymId?: string;
}

export interface QrPassTokenClaims extends JwtPayload, QrPassPayload {
  typ: 'ACCESS_QR';
  timestamp: number;
}

/**
 * Signs a hardened Mobile Session JWT
 * - Enforces HS256 algorithm pinning
 * - Includes standard issuer ('gymos-platform') and audience ('gymos-mobile')
 * - Expires in 30 days
 */
export function signMobileSessionToken(payload: MobileSessionPayload): string {
  const options: SignOptions = {
    algorithm: 'HS256',
    expiresIn: '30d',
    issuer: ISSUER,
    audience: AUDIENCE_MOBILE,
  };

  return jwt.sign(
    {
      ...payload,
      typ: 'SESSION',
    },
    AUTH_SECRET,
    options
  );
}

/**
 * Verifies a Mobile Session JWT with strict algorithm and claim checks
 * - Prevents algorithm confusion / 'none' attacks by strictly accepting HS256
 * - Validates issuer, audience, and token type
 */
export function verifyMobileSessionToken(token: string): MobileSessionTokenClaims {
  const verifyOptions: VerifyOptions = {
    algorithms: ['HS256'],
    issuer: ISSUER,
    audience: AUDIENCE_MOBILE,
  };

  const decoded = jwt.verify(token, AUTH_SECRET, verifyOptions) as MobileSessionTokenClaims;

  if (decoded.typ !== 'SESSION') {
    throw new Error('Type de token invalide : Token de session requis');
  }

  return decoded;
}

/**
 * Signs an anti-screenshot, dynamic 60-second QR Access Pass JWT
 * - Enforces HS256 algorithm pinning
 * - Includes issuer and audience ('gymos-scanner')
 * - Enforces 60-second validity with anti-tampering timestamp
 */
export function signQrPassToken(payload: QrPassPayload): string {
  const options: SignOptions = {
    algorithm: 'HS256',
    expiresIn: '60s',
    issuer: ISSUER,
    audience: AUDIENCE_SCANNER,
  };

  return jwt.sign(
    {
      ...payload,
      typ: 'ACCESS_QR',
      timestamp: Date.now(),
    },
    QR_SECRET,
    options
  );
}

/**
 * Verifies a QR Access Pass JWT
 * - Prevents algorithm confusion by strictly requiring HS256
 * - Validates issuer and scanner audience
 * - Enforces 60-second anti-screenshot window
 */
export function verifyQrPassToken(token: string): QrPassTokenClaims {
  const verifyOptions: VerifyOptions = {
    algorithms: ['HS256'],
    issuer: ISSUER,
    audience: AUDIENCE_SCANNER,
    clockTolerance: 5, // 5s max clock tolerance
  };

  const decoded = jwt.verify(token, QR_SECRET, verifyOptions) as QrPassTokenClaims;

  if (decoded.typ !== 'ACCESS_QR') {
    throw new Error('Type de token invalide : Pass QR requis');
  }

  // Verify anti-screenshot freshness (must be under 65s old)
  if (!decoded.timestamp || Date.now() - decoded.timestamp > 65000) {
    throw new Error('Pass QR expiré (délai de 60s dépassé)');
  }

  return decoded;
}
