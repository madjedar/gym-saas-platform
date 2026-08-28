import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { 
  safeCompare, 
  secureErrorResponse, 
  stripPrototypePollution, 
  checkRateLimit, 
  rateLimitExceededResponse,
  getRateLimitHeaders
} from '@/lib/security';
import { webhookLogisticsSchema } from '@/lib/validations';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // 1. Rate Limiting: 60 webhook updates per minute per IP
  const rateLimit = checkRateLimit(req, { limit: 60, windowMs: 60000, keyPrefix: 'webhook-logistics' });
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit.resetSeconds, 60);
  }

  try {
    // 2. Authenticate webhook via HMAC signature (Standard for Algerian Couriers like Yalidine/Guepex)
    const signature = req.headers.get('x-webhook-signature');
    const payload = await req.text();

    if (!payload) {
      return NextResponse.json({ error: 'Corps de requête vide' }, { status: 400 });
    }
    
    // Constant-time timing-safe signature comparison
    const secret = env.WEBHOOK_SECRET;
    const expectedSignature = crypto.createHmac('sha256', secret)
                                    .update(payload)
                                    .digest('hex');
                                    
    if (!signature || !safeCompare(signature, expectedSignature)) {
      return NextResponse.json({ error: 'Signature Webhook Invalide' }, { status: 401 });
    }

    let parsedJson;
    try {
      parsedJson = stripPrototypePollution(JSON.parse(payload));
    } catch {
      return NextResponse.json({ error: 'JSON malformé' }, { status: 400 });
    }

    // 3. Validate Webhook Payload with Zod Schema
    const validationResult = webhookLogisticsSchema.safeParse(parsedJson);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues.map(e => e.message).join(". ");
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const data = validationResult.data;
    
    // 4. State Machine: Map local Algerian courier statuses to our strict universal Enum
    let newStatus: 'PENDING' | 'PROCESSING' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED' = 'PROCESSING';
    
    const rawStatus = (data.status || '').toLowerCase();
    
    if (rawStatus.includes('livré') || rawStatus.includes('delivered')) {
      newStatus = 'DELIVERED';
    } else if (rawStatus.includes('en préparation')) {
      newStatus = 'PROCESSING';
    } else if (rawStatus.includes('expédié') || rawStatus.includes('en route') || rawStatus.includes('vers wilaya')) {
      newStatus = 'DISPATCHED';
    } else if (rawStatus.includes('annulé') || rawStatus.includes('retour') || rawStatus.includes('échoué')) {
      newStatus = 'CANCELLED';
    }

    // 5. Perform database update securely
    await prisma.order.update({
      where: { id: data.order_id },
      data: { 
        status: newStatus,
        trackingNumber: data.tracking || undefined
      }
    });

    console.log(`[WEBHOOK] Order ${data.order_id} updated to ${newStatus}`);

    return NextResponse.json(
      { success: true, mappedStatus: newStatus },
      { headers: getRateLimitHeaders(60, rateLimit.remaining, rateLimit.resetSeconds) }
    );
  } catch (error) {
    return secureErrorResponse(error, 'Échec du traitement du webhook logistique');
  }
}
