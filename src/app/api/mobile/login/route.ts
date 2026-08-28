import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { 
  checkRateLimit, 
  rateLimitExceededResponse, 
  handleCorsPreflight, 
  getCorsHeaders, 
  getRateLimitHeaders,
  secureErrorResponse 
} from '@/lib/security';
import { mobileLoginSchema } from '@/lib/validations';
import { signMobileSessionToken } from '@/lib/jwt-security';
import { verifyPassword, needsRehash, hashPassword } from '@/lib/password';

export const dynamic = 'force-dynamic';

// Handle CORS preflight
export async function OPTIONS(req: Request) {
  return handleCorsPreflight(req, 'POST, OPTIONS');
}

export async function POST(req: Request) {
  // 1. Rate Limiting: Max 5 login attempts per minute per IP to prevent brute-forcing
  const rateLimit = checkRateLimit(req, { limit: 5, windowMs: 60000, keyPrefix: 'mobile-login' });
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit.resetSeconds, 5);
  }

  try {
    const body = await req.json();

    // 2. Validate Credentials with Zod Schema
    const validationResult = mobileLoginSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues.map(e => e.message).join(". ");
      return NextResponse.json(
        { error: errorMessage },
        { status: 400, headers: getCorsHeaders(req, 'POST, OPTIONS') }
      );
    }

    const { email, password } = validationResult.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        gym: true,
        subscriptions: {
          where: { status: 'ACTIVE', endDate: { gt: new Date() } },
          include: { plan: true },
          orderBy: { endDate: 'desc' },
          take: 1
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Identifiants invalides' },
        { status: 401, headers: getCorsHeaders(req, 'POST, OPTIONS') }
      );
    }

    // 3. Verify password with hardened password engine
    const isPasswordValid = await verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Identifiants invalides' },
        { status: 401, headers: getCorsHeaders(req, 'POST, OPTIONS') }
      );
    }

    // 4. Transparent Automatic Password Upgrade / Rehashing
    if (needsRehash(user.passwordHash)) {
      try {
        const upgradedHash = await hashPassword(password);
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: upgradedHash }
        });
        console.log(`[MOBILE PASSWORD SECURITY] Upgraded password hash to bcrypt (cost 12) for: ${user.email}`);
      } catch (rehashErr) {
        console.error('[MOBILE PASSWORD SECURITY] Failed to rehash password:', rehashErr);
      }
    }

    // 5. Issue hardened Mobile Session JWT with algorithm pinning and claim binding
    const token = signMobileSessionToken({
      userId: user.id,
      gymId: user.gymId,
      email: user.email,
      role: user.role,
    });

    const activeSub = user.subscriptions[0];
    let daysRemaining = 0;
    if (activeSub) {
      daysRemaining = Math.max(0, Math.ceil((new Date(activeSub.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    }

    return NextResponse.json(
      {
        success: true,
        token,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          gymId: user.gymId,
          gymName: user.gym?.name,
        },
        subscription: activeSub ? {
          id: activeSub.id,
          planName: activeSub.plan.name,
          status: activeSub.status,
          daysRemaining,
          endDate: activeSub.endDate
        } : null
      },
      { 
        headers: {
          ...getCorsHeaders(req, 'POST, OPTIONS'),
          ...getRateLimitHeaders(5, rateLimit.remaining, rateLimit.resetSeconds)
        }
      }
    );
  } catch (error: any) {
    return secureErrorResponse(error, 'Impossible de traiter la demande d\'authentification');
  }
}
