import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { posOrderSchema } from '@/lib/validations';
import { 
  checkRateLimit, 
  rateLimitExceededResponse, 
  handleCorsPreflight,
  getCorsHeaders, 
  getRateLimitHeaders, 
  secureErrorResponse 
} from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function OPTIONS(req: Request) {
  return handleCorsPreflight(req, 'GET, POST, OPTIONS');
}

export async function GET(req: Request) {
  const rateLimit = checkRateLimit(req, { limit: 60, windowMs: 60000, keyPrefix: 'pos-get' });
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit.resetSeconds, 60);
  }

  try {
    const session = await getServerSession(authOptions);
    let gymId = session?.user?.gymId;

    if (!gymId) {
      const defaultGym = await prisma.gym.findFirst();
      gymId = defaultGym?.id;
    }

    if (!gymId) {
      return NextResponse.json({ error: 'Gym non trouvée' }, { status: 404, headers: getCorsHeaders(req) });
    }

    const products = await prisma.product.findMany({
      where: { gymId },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(
      { success: true, products },
      { 
        headers: {
          ...getCorsHeaders(req),
          ...getRateLimitHeaders(60, rateLimit.remaining, rateLimit.resetSeconds)
        }
      }
    );
  } catch (error) {
    return secureErrorResponse(error, 'Échec de la récupération des produits');
  }
}

export async function POST(req: Request) {
  // 1. Rate Limiting: Max 30 checkout transactions per minute per IP
  const rateLimit = checkRateLimit(req, { limit: 30, windowMs: 60000, keyPrefix: 'pos-order' });
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit.resetSeconds, 30);
  }

  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    let gymId = session?.user?.gymId;
    let userId = session?.user?.id;

    // 2. Authorization check: Only Staff, Owners, and Super Admins can process POS orders
    if (role && role !== "STAFF" && role !== "GYM_OWNER" && role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: 'Accès interdit : Seul le personnel autorisé peut encaisser des commandes' },
        { status: 403, headers: getCorsHeaders(req) }
      );
    }

    if (!gymId || !userId) {
      const defaultGym = await prisma.gym.findFirst({
        include: { users: { where: { role: 'GYM_OWNER' }, take: 1 } }
      });
      gymId = defaultGym?.id;
      userId = defaultGym?.users[0]?.id;
    }

    if (!gymId || !userId) {
      return NextResponse.json(
        { error: 'Non autorisé : Établissement ou utilisateur non identifié' },
        { status: 401, headers: getCorsHeaders(req) }
      );
    }

    // 3. Validate Request Body with Zod
    const body = await req.json();
    const validationResult = posOrderSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues.map(e => e.message).join(". ");
      return NextResponse.json(
        { error: errorMessage },
        { status: 400, headers: getCorsHeaders(req) }
      );
    }

    const { items } = validationResult.data;

    // 4. Server-Side Price Calculation & Stock Verification (Prevents Price Tampering)
    const productIds = items.map(i => i.productId);
    const dbProducts = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        gymId: gymId
      }
    });

    if (dbProducts.length !== items.length) {
      return NextResponse.json(
        { error: 'Un ou plusieurs articles sont introuvables dans cet établissement' },
        { status: 400, headers: getCorsHeaders(req) }
      );
    }

    const productMap = new Map(dbProducts.map(p => [p.id, p]));
    let calculatedTotal = 0;
    const validatedOrderItems: { productId: string; quantity: number; unitPrice: number }[] = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return NextResponse.json({ error: `Article introuvable (${item.productId})` }, { status: 400, headers: getCorsHeaders(req) });
      }

      if (product.stockQuantity < item.quantity) {
        return NextResponse.json(
          { error: `Stock insuffisant pour "${product.name}" (Disponible: ${product.stockQuantity})` },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }

      calculatedTotal += product.price * item.quantity;
      validatedOrderItems.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice: product.price
      });
    }

    // 5. Create Order and Decrement Stock in Atomic Transaction
    const order = await prisma.$transaction(async (tx) => {
      // 1. Create the Order
      const newOrder = await tx.order.create({
        data: {
          gymId: gymId!,
          userId: userId!,
          totalAmount: calculatedTotal,
          status: 'DELIVERED', // In-store POS purchase is directly fulfilled
          items: {
            create: validatedOrderItems
          }
        }
      });

      // 2. Decrement Stock for each item strictly verifying gymId
      for (const item of validatedOrderItems) {
        await tx.product.update({
          where: { 
            id: item.productId,
            gymId: gymId!
          },
          data: {
            stockQuantity: {
              decrement: item.quantity
            }
          }
        });
      }

      // 3. Log transaction with recalculation
      await tx.transaction.create({
        data: {
          gymId: gymId!,
          userId: userId!,
          amount: calculatedTotal,
          type: 'POS',
          method: 'CASH',
        }
      });

      return newOrder;
    });

    return NextResponse.json(
      { 
        success: true, 
        order,
        recalculatedTotal: calculatedTotal 
      },
      { 
        headers: {
          ...getCorsHeaders(req),
          ...getRateLimitHeaders(30, rateLimit.remaining, rateLimit.resetSeconds)
        }
      }
    );
  } catch (error: any) {
    return secureErrorResponse(error, 'Erreur lors de la validation de la commande POS');
  }
}
