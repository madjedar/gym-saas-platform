import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { 
  safeCompare, 
  secureErrorResponse, 
  checkRateLimit, 
  rateLimitExceededResponse,
  getRateLimitHeaders
} from '@/lib/security';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return handleCron(req);
}

export async function POST(req: Request) {
  return handleCron(req);
}

async function handleCron(req: Request) {
  // 1. Rate Limiting: Max 5 cron executions per minute
  const rateLimit = checkRateLimit(req, { limit: 5, windowMs: 60000, keyPrefix: 'cron-daily' });
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit.resetSeconds, 5);
  }

  try {
    const authHeader = (req.headers.get('authorization') || '').trim();
    const expectedSecret = (env.CRON_SECRET || '').trim();
    const expectedHeader = `Bearer ${expectedSecret}`;

    if (!safeCompare(authHeader, expectedHeader)) {
      return NextResponse.json({ error: 'Non autorisé : Clé cron invalide' }, { status: 401 });
    }

    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);

    // 1. Update Expired Subscriptions
    const expiredResult = await prisma.subscription.updateMany({
      where: {
        endDate: { lt: now },
        status: { not: 'EXPIRED' }
      },
      data: {
        status: 'EXPIRED'
      }
    });

    // 2. Find Subscriptions expiring in exactly 3 days (for push notifications)
    const expiringSoon = await prisma.subscription.findMany({
      where: {
        endDate: {
          gte: new Date(threeDaysFromNow.setHours(0, 0, 0, 0)),
          lt: new Date(threeDaysFromNow.setHours(23, 59, 59, 999))
        },
        status: 'ACTIVE'
      },
      include: {
        user: true,
        gym: true
      }
    });

    // Update status to EXPIRING_SOON
    if (expiringSoon.length > 0) {
      await prisma.subscription.updateMany({
        where: {
          id: { in: expiringSoon.map(sub => sub.id) }
        },
        data: {
          status: 'EXPIRING_SOON'
        }
      });
    }

    return NextResponse.json(
      { 
        success: true, 
        expiredCount: expiredResult.count,
        expiringSoonCount: expiringSoon.length 
      },
      { headers: getRateLimitHeaders(5, rateLimit.remaining, rateLimit.resetSeconds) }
    );
  } catch (error) {
    return secureErrorResponse(error, 'Échec de l\'exécution du job cron');
  }
}
