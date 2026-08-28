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
import { verifyMobileSessionToken, signQrPassToken } from '@/lib/jwt-security';

export const dynamic = 'force-dynamic';

export async function OPTIONS(req: Request) {
  return handleCorsPreflight(req, 'GET, OPTIONS');
}

export async function GET(req: Request) {
  // 1. Rate Limiting: 20 token generations per minute per IP
  const rateLimit = checkRateLimit(req, { limit: 20, windowMs: 60000, keyPrefix: 'mobile-qr' });
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit.resetSeconds, 20);
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token d\'authentification manquant' },
        { status: 401, headers: getCorsHeaders(req, 'GET, OPTIONS') }
      );
    }

    const token = authHeader.substring(7);
    let decoded;

    try {
      // 2. Verify Session JWT with HS256 algorithm pinning and claim validation
      decoded = verifyMobileSessionToken(token);
    } catch (err: any) {
      return NextResponse.json(
        { error: 'Session expirée ou invalide. Veuillez vous reconnecter.' },
        { status: 401, headers: getCorsHeaders(req, 'GET, OPTIONS') }
      );
    }

    // Check user & gym in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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
        { error: 'Utilisateur introuvable' },
        { status: 404, headers: getCorsHeaders(req, 'GET, OPTIONS') }
      );
    }

    const activeSub = user.subscriptions[0];

    if (!activeSub) {
      return NextResponse.json(
        { 
          error: 'Aucun abonnement actif trouvé. Veuillez renouveler à l\'accueil.',
          subscriptionExpired: true 
        },
        { status: 403, headers: getCorsHeaders(req, 'GET, OPTIONS') }
      );
    }

    const daysRemaining = Math.max(0, Math.ceil((new Date(activeSub.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

    // 3. Issue anti-counterfeit dynamic 60s QR JWT with pinned algorithm and scanner audience
    const qrToken = signQrPassToken({
      userId: user.id,
      gymId: user.gymId,
    });

    return NextResponse.json(
      {
        success: true,
        qrToken,
        expiresInSeconds: 60,
        user: {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          gymName: user.gym.name
        },
        subscription: {
          planName: activeSub.plan.name,
          daysRemaining,
          endDate: activeSub.endDate
        }
      },
      { 
        headers: {
          ...getCorsHeaders(req, 'GET, OPTIONS'),
          ...getRateLimitHeaders(20, rateLimit.remaining, rateLimit.resetSeconds)
        }
      }
    );
  } catch (error: any) {
    return secureErrorResponse(error, 'Erreur lors de la génération du pass QR');
  }
}
