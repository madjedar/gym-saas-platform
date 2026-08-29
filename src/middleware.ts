import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/security";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

/** Edge-compatible structured log (cannot import Node.js logger here) */
function secLog(event: string, ctx: Record<string, unknown>) {
  console.error(JSON.stringify({ level: 'security', event, ts: new Date().toISOString(), ...ctx }));
}

export default withAuth(
  function middleware(req) {
    const path = req.nextUrl.pathname;

    // 1. Edge-Level CORS Preflight Interception for all API endpoints
    if (req.method === "OPTIONS" && path.startsWith("/api/")) {
      return handleCorsPreflight(req);
    }

    // 2. Edge-Level Sliding Window Rate Limiter
    let limit = 120;
    let keyPrefix = "page";

    if (path.startsWith("/api/auth") || path === "/login") {
      limit = 15; // 15 auth attempts / min per IP to prevent brute-force
      keyPrefix = "edge-auth";
    } else if (path.startsWith("/api/")) {
      limit = 60; // 60 api requests / min per IP
      keyPrefix = "edge-api";
    } else if (path.startsWith("/dashboard") || path.startsWith("/reception")) {
      limit = 120; // 120 page loads / min per IP
      keyPrefix = "edge-dashboard";
    }

    const rateLimit = checkRateLimit(req, { limit, windowMs: 60000, keyPrefix });
    if (!rateLimit.allowed) {
      secLog('RATE_LIMIT_HIT', { ip: req.headers.get('x-forwarded-for') || 'unknown', path, keyPrefix });
      return rateLimitExceededResponse(rateLimit.resetSeconds, limit);
    }

    const token = req.nextauth?.token;
    const role = token?.role;

    // 3. Members cannot access staff/management subroutes or reception scanner
    if (role === "MEMBER") {
      if (
        path.startsWith("/dashboard/members") ||
        path.startsWith("/dashboard/pos") ||
        path.startsWith("/dashboard/settings") ||
        path.startsWith("/reception")
      ) {
        secLog('UNAUTHORIZED_ROLE_ACCESS', { role, path, ip: req.headers.get('x-forwarded-for') || 'unknown' });
        return NextResponse.redirect(new URL("/dashboard?error=UnauthorizedRole", req.url));
      }
    }

    // 4. Settings & Financial configurations: Strictly Owners and Super Admins
    if (path.startsWith("/dashboard/settings")) {
      if (role !== "GYM_OWNER" && role !== "SUPER_ADMIN") {
        secLog('UNAUTHORIZED_SETTINGS_ACCESS', { role, path, ip: req.headers.get('x-forwarded-for') || 'unknown' });
        return NextResponse.redirect(new URL("/dashboard?error=UnauthorizedRole", req.url));
      }
    }

    // 5. Reception scanner: Staff, Gym Owners, Super Admins
    if (path.startsWith("/reception")) {
      if (role !== "STAFF" && role !== "GYM_OWNER" && role !== "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/dashboard?error=UnauthorizedRole", req.url));
      }
    }

    // 6. Build response with rate limit tracking & CORS headers
    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", String(limit));
    response.headers.set("X-RateLimit-Remaining", String(rateLimit.remaining));
    response.headers.set("X-RateLimit-Reset", String(rateLimit.resetSeconds));

    if (path.startsWith("/api/")) {
      const corsHeaders = getCorsHeaders(req);
      Object.entries(corsHeaders).forEach(([k, v]) => {
        response.headers.set(k, v);
      });
    }

    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        // Public API and web routes do not require pre-existing session
        if (
          path === "/login" ||
          path.startsWith("/api/")
        ) {
          return true;
        }
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/reception/:path*",
    "/login",
    "/api/:path*",
  ],
};
