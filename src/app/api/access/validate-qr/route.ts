import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  checkRateLimit, 
  rateLimitExceededResponse, 
  handleCorsPreflight, 
  getCorsHeaders, 
  getRateLimitHeaders,
  secureErrorResponse 
} from '@/lib/security';
import { validateQrSchema } from '@/lib/validations';
import { verifyQrPassToken, signQrPassToken } from '@/lib/jwt-security';

export const dynamic = 'force-dynamic';

export async function OPTIONS(req: Request) {
  return handleCorsPreflight(req, 'GET, POST, OPTIONS');
}

// Helper endpoint to generate a test token for demo simulation
export async function GET(req: Request) {
  // Rate limit demo token generation: 20 req/min
  const rateLimit = checkRateLimit(req, { limit: 20, windowMs: 60000, keyPrefix: 'qr-get' });
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit.resetSeconds, 20);
  }

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'active';

    const defaultGym = await prisma.gym.findFirst();
    if (!defaultGym) {
      return NextResponse.json({ error: 'Établissement introuvable' }, { status: 404, headers: getCorsHeaders(req) });
    }

    let member;
    if (type === 'active') {
      member = await prisma.user.findFirst({
        where: {
          gymId: defaultGym.id,
          subscriptions: { some: { status: 'ACTIVE' } }
        },
        include: { subscriptions: { include: { plan: true } } }
      });
    } else {
      member = await prisma.user.findFirst({
        where: {
          gymId: defaultGym.id,
          subscriptions: { none: { status: 'ACTIVE' } }
        }
      });
    }

    if (!member) {
      member = await prisma.user.findFirst({ where: { gymId: defaultGym.id, role: 'MEMBER' } });
    }

    if (!member) {
      return NextResponse.json({ error: 'Aucun adhérent trouvé dans la base' }, { status: 404, headers: getCorsHeaders(req) });
    }

    // Sign a real JWT with current timestamp and pinned HS256 algorithm
    const token = signQrPassToken({
      userId: member.id,
      gymId: defaultGym.id,
    });

    return NextResponse.json(
      {
        success: true,
        token,
        member: {
          id: member.id,
          name: `${member.firstName} ${member.lastName}`,
          email: member.email
        }
      },
      { 
        headers: {
          ...getCorsHeaders(req),
          ...getRateLimitHeaders(20, rateLimit.remaining, rateLimit.resetSeconds)
        }
      }
    );
  } catch (error: any) {
    return secureErrorResponse(error, 'Impossible de générer le QR de test');
  }
}

export async function POST(req: Request) {
  // 1. Rate Limiting: 30 validations per minute per IP to prevent scanner flooding / token guessing
  const rateLimit = checkRateLimit(req, { limit: 30, windowMs: 60000, keyPrefix: 'qr-validate' });
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit.resetSeconds, 30);
  }

  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;

    if (role && role !== "STAFF" && role !== "GYM_OWNER" && role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: 'Accès non autorisé : Seul le personnel de réception peut valider les entrées' },
        { status: 403, headers: getCorsHeaders(req) }
      );
    }

    let receptionistGymId = session?.user?.gymId;

    if (!receptionistGymId) {
      const defaultGym = await prisma.gym.findFirst();
      receptionistGymId = defaultGym?.id;
    }

    if (!receptionistGymId) {
      return NextResponse.json({ error: 'Salle de sport introuvable' }, { status: 401, headers: getCorsHeaders(req) });
    }

    const body = await req.json();
    const validationResult = validateQrSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Token QR manquant ou format invalide' },
        { status: 400, headers: getCorsHeaders(req) }
      );
    }

    const { qrToken } = validationResult.data;

    // 1. Decrypt & verify QR cryptographic signature using hardened JWT engine
    let decoded;
    try {
      decoded = verifyQrPassToken(qrToken);
    } catch (err: any) {
      return NextResponse.json(
        { error: err.message || 'QR Code invalide ou signature falsifiée' },
        { status: 400, headers: getCorsHeaders(req) }
      );
    }

    // 2. Fetch member details within tenant boundaries
    const member = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!member) {
      return NextResponse.json({ error: 'Adhérent introuvable' }, { status: 404, headers: getCorsHeaders(req) });
    }

    // 3. Verify active subscription strictly for this gym
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: decoded.userId,
        gymId: receptionistGymId,
        status: 'ACTIVE',
        endDate: { gt: new Date() }
      },
      include: { plan: true }
    });

    if (!subscription) {
      return NextResponse.json({ 
        error: `Accès Refusé : Aucun abonnement actif pour ${member.firstName} ${member.lastName}`,
        member: { name: `${member.firstName} ${member.lastName}` }
      }, { status: 403, headers: getCorsHeaders(req) });
    }

    // 4. Log attendance
    await prisma.attendanceLog.create({
      data: {
        userId: decoded.userId,
        gymId: receptionistGymId,
        method: 'QR',
        checkInTime: new Date()
      }
    });

    return NextResponse.json(
      { 
        success: true, 
        message: `Bienvenue, ${member.firstName} ${member.lastName} ! (${subscription.plan?.name})`,
        member: {
          name: `${member.firstName} ${member.lastName}`,
          plan: subscription.plan?.name,
          daysLeft: Math.ceil((new Date(subscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        }
      },
      { 
        headers: {
          ...getCorsHeaders(req),
          ...getRateLimitHeaders(30, rateLimit.remaining, rateLimit.resetSeconds)
        }
      }
    );
  } catch (e: any) {
    return secureErrorResponse(e, 'Erreur lors de la validation du pass d\'accès');
  }
}
