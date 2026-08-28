import { NextResponse } from 'next/server';
import { getCorsHeaders } from './cors';
import { logger } from './logger';

/**
 * Base Application Error class with HTTP status code and client-safe messaging.
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public details?: any;

  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Données de formulaire invalides', details?: any) {
    super(message, 400, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentification requise pour effectuer cette action') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Accès interdit : Privilèges insuffisants') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'La ressource demandée est introuvable') {
    super(message, 404);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Trop de requêtes. Veuillez patienter avant de réessayer.') {
    super(message, 429);
  }
}

/**
 * Translates Prisma error codes into clear, localized user messages.
 */
export function formatPrismaError(error: any): string {
  if (!error) return 'Une erreur de base de données est survenue';

  // Prisma Unique Constraint Violation
  if (error.code === 'P2002') {
    const target = Array.isArray(error.meta?.target) ? error.meta.target.join(', ') : 'champ';
    return `Un enregistrement avec cette valeur (${target}) existe déjà dans votre salle.`;
  }

  // Prisma Record Not Found
  if (error.code === 'P2025') {
    return 'L\'élément demandé est introuvable ou a déjà été supprimé.';
  }

  // Prisma Foreign Key Constraint Failure
  if (error.code === 'P2003') {
    return 'Impossible d\'effectuer l\'opération car des éléments liés dépendent de cette ressource.';
  }

  // Prisma Connection / Timeout error
  if (error.code === 'P1001' || error.code === 'P1008') {
    return 'La base de données est temporairement inaccessible. Veuillez réessayer dans un instant.';
  }

  return error.message || 'Une erreur inattendue est survenue';
}

/**
 * Formats errors for Server Actions, ensuring user-friendly French error strings.
 */
export function handleServerActionError(error: any, fallbackMessage: string = 'Une erreur est survenue'): never {
  logger.error('SERVER_ACTION_ERROR', error, { fallbackMessage });

  if (error instanceof AppError) {
    throw new Error(error.message);
  }

  // Handle Prisma error codes
  if (error?.code && typeof error.code === 'string' && error.code.startsWith('P')) {
    throw new Error(formatPrismaError(error));
  }

  if (error instanceof Error) {
    throw new Error(error.message);
  }

  throw new Error(fallbackMessage);
}

/**
 * Standardized API Error Response Formatter for route handlers.
 */
export function handleApiErrorResponse(
  error: any,
  fallbackMessage: string = 'Une erreur interne est survenue',
  req?: Request
): NextResponse {
  logger.error('API_ROUTE_ERROR', error, { fallbackMessage });

  const isDev = process.env.NODE_ENV !== 'production';
  let statusCode = 500;
  let clientMessage = fallbackMessage;
  let details: any = undefined;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    clientMessage = error.message;
    details = error.details;
  } else if (error?.code && typeof error.code === 'string' && error.code.startsWith('P')) {
    statusCode = error.code === 'P2025' ? 404 : 400;
    clientMessage = formatPrismaError(error);
  } else if (error instanceof Error && isDev) {
    clientMessage = error.message;
  }

  return NextResponse.json(
    {
      error: clientMessage,
      ...(details ? { details } : {}),
      ...(isDev && error?.stack ? { stack: error.stack } : {}),
    },
    {
      status: statusCode,
      headers: getCorsHeaders(req),
    }
  );
}
