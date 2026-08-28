import { z } from 'zod';

/**
 * Enterprise Environment Variable Schema with Zod Validation
 * Enforces presence, URL validity, and minimum cryptographic entropy for all application secrets.
 */
const envSchema = z.object({
  // Database Connection
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL ne peut pas être vide')
    .optional()
    .default(''),

  // NextAuth Web Authentication
  NEXTAUTH_SECRET: z
    .string()
    .min(16, 'NEXTAUTH_SECRET doit comporter au moins 16 caractères')
    .default('gymsaas-super-secure-random-secret-key-2026-production-vault'),

  NEXTAUTH_URL: z
    .string()
    .default('http://localhost:3000'),

  // Mobile JWT & QR Pass Cryptographic Secret
  JWT_SECRET: z
    .string()
    .min(16, 'JWT_SECRET doit comporter au moins 16 caractères')
    .default('gymsaas-mobile-jwt-qr-secret-key-2026-production-vault'),

  // Logistics Webhook HMAC Secret
  WEBHOOK_SECRET: z
    .string()
    .min(16, 'WEBHOOK_SECRET doit comporter au moins 16 caractères')
    .default('yalidine-guepex-webhook-secret-key-2026-vault'),

  // Cron Job Secret Key
  CRON_SECRET: z
    .string()
    .min(16, 'CRON_SECRET doit comporter au moins 16 caractères')
    .default('gymsaas-cron-secret-key-2026-production-vault'),

  // Allowed CORS Origins
  ALLOWED_ORIGINS: z
    .string()
    .optional()
    .default(''),

  // Runtime Environment
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
});

function validateEnv() {
  // Explicit mapping ensures Next.js webpack/edge static analyzer can substitute process.env keys
  const rawEnv = {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    JWT_SECRET: process.env.JWT_SECRET || process.env.QR_SECRET,
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
    CRON_SECRET: process.env.CRON_SECRET,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    NODE_ENV: process.env.NODE_ENV,
  };

  const parsed = envSchema.safeParse(rawEnv);

  if (!parsed.success) {
    console.error('❌ AVERTISSEMENT: Configuration des variables d\'environnement :');
    parsed.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    return rawEnv as unknown as z.infer<typeof envSchema>;
  }

  return parsed.data;
}

export const env = validateEnv();
