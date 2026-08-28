import { z } from "zod";
import { sanitizeXss } from "./security";
import { validatePasswordStrength } from "./password";

// Regular expressions
const algerianPhoneRegex = /^(0|\+213)[567][0-9]{8}$/;

// File Upload Constraints
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * File Upload Schema for Images
 */
export const fileUploadSchema = z
  .any()
  .refine((file) => file instanceof File || file instanceof Blob, "Fichier invalide")
  .refine((file) => file?.size <= MAX_FILE_SIZE, "La taille maximale du fichier est de 2MB")
  .refine(
    (file) => ACCEPTED_IMAGE_TYPES.includes(file?.type),
    "Seuls les formats JPEG, PNG et WebP sont autorisés"
  );

/**
 * Strong Password Schema enforcing OWASP complexity
 */
export const strongPasswordSchema = z
  .string()
  .min(8, "Le mot de passe doit comporter au moins 8 caractères")
  .max(128, "Le mot de passe ne peut pas dépasser 128 caractères")
  .superRefine((val, ctx) => {
    const result = validatePasswordStrength(val);
    if (!result.valid && result.message) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.message,
      });
    }
  });

/**
 * Change Password Schema
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Le mot de passe actuel est requis")
      .max(128),
    newPassword: strongPasswordSchema,
    confirmPassword: z
      .string()
      .min(1, "Veuillez confirmer le nouveau mot de passe")
      .max(128),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Les nouveaux mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/**
 * Member Registration Schema with XSS Injection Protection
 */
export const addMemberSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, "Le prénom doit comporter au moins 2 caractères")
    .max(50, "Le prénom ne peut pas dépasser 50 caractères")
    .transform((val) => sanitizeXss(val, 50)),
  lastName: z
    .string()
    .trim()
    .min(2, "Le nom doit comporter au moins 2 caractères")
    .max(50, "Le nom ne peut pas dépasser 50 caractères")
    .transform((val) => sanitizeXss(val, 50)),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Adresse email invalide")
    .max(100, "L'email ne peut pas dépasser 100 caractères")
    .transform((val) => sanitizeXss(val, 100)),
  phone: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine(
      (val) => !val || val === "" || algerianPhoneRegex.test(val.replace(/\s+/g, "")),
      "Numéro de téléphone algérien invalide (ex: 0550123456 ou +213661987654)"
    )
    .transform((val) => (val ? sanitizeXss(val, 20) : null)),
  planId: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((val) => (val ? sanitizeXss(val, 50) : null)),
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;

/**
 * Plan Assignment Schema
 */
export const assignPlanSchema = z.object({
  memberId: z
    .string()
    .trim()
    .min(5, "Identifiant de membre invalide")
    .transform((val) => sanitizeXss(val, 50)),
  planId: z
    .string()
    .trim()
    .min(5, "Identifiant de formule invalide")
    .transform((val) => sanitizeXss(val, 50)),
});

export type AssignPlanInput = z.infer<typeof assignPlanSchema>;

/**
 * Subscription Plan Creation Schema
 */
export const createPlanSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Le nom de formule doit comporter au moins 2 caractères")
    .max(100, "Le nom de formule ne peut pas dépasser 100 caractères")
    .transform((val) => sanitizeXss(val, 100)),
  durationInDays: z
    .number()
    .int("La durée doit être un nombre entier de jours")
    .min(1, "La durée minimum est de 1 jour")
    .max(730, "La durée maximum est de 730 jours (2 ans)"),
  price: z
    .number()
    .min(100, "Le prix minimum est de 100 DZD")
    .max(1000000, "Le prix maximum est de 1 000 000 DZD"),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;

/**
 * Gym Information Update Schema with Injection Defense
 */
export const updateGymInfoSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Le nom de la salle doit comporter au moins 2 caractères")
    .max(100, "Le nom de la salle ne peut pas dépasser 100 caractères")
    .transform((val) => sanitizeXss(val, 100)),
  phone: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine(
      (val) => !val || val === "" || algerianPhoneRegex.test(val.replace(/\s+/g, "")),
      "Numéro de téléphone invalide (ex: 0550123456)"
    )
    .transform((val) => (val ? sanitizeXss(val, 20) : null)),
  address: z
    .string()
    .trim()
    .max(200, "L'adresse ne peut pas dépasser 200 caractères")
    .optional()
    .nullable()
    .transform((val) => (val ? sanitizeXss(val, 200) : null)),
});

export type UpdateGymInfoInput = z.infer<typeof updateGymInfoSchema>;

/**
 * POS Cashier Order Checkout Schema
 */
export const posOrderItemSchema = z.object({
  productId: z
    .string()
    .trim()
    .min(5, "Identifiant produit invalide")
    .transform((val) => sanitizeXss(val, 50)),
  quantity: z
    .number()
    .int("La quantité doit être un nombre entier")
    .min(1, "La quantité minimum est de 1")
    .max(100, "La quantité maximum par article est de 100"),
});

export const posOrderSchema = z.object({
  items: z
    .array(posOrderItemSchema)
    .min(1, "Le panier doit contenir au moins un produit")
    .max(50, "Le panier ne peut pas dépasser 50 articles distincts"),
});

export type PosOrderInput = z.infer<typeof posOrderSchema>;

/**
 * Mobile Login Schema
 */
export const mobileLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Format d'email invalide")
    .max(100, "L'email ne peut pas dépasser 100 caractères")
    .transform((val) => sanitizeXss(val, 100)),
  password: z
    .string()
    .min(1, "Le mot de passe est requis")
    .max(128, "Le mot de passe ne peut pas dépasser 128 caractères"),
});

export type MobileLoginInput = z.infer<typeof mobileLoginSchema>;

/**
 * Validate QR Payload Schema
 */
export const validateQrSchema = z.object({
  qrToken: z
    .string()
    .trim()
    .min(20, "Format de pass QR invalide")
    .max(1024, "Taille de token QR invalide")
    .transform((val) => sanitizeXss(val, 1024)),
});

export type ValidateQrInput = z.infer<typeof validateQrSchema>;

/**
 * Logistics Webhook Payload Schema with Prototype Pollution Defense
 */
export const webhookLogisticsSchema = z.object({
  order_id: z
    .string()
    .trim()
    .min(5, "order_id invalide")
    .transform((val) => sanitizeXss(val, 50)),
  status: z
    .string()
    .trim()
    .max(50)
    .transform((val) => sanitizeXss(val, 50)),
  tracking: z
    .string()
    .trim()
    .max(100)
    .optional()
    .nullable()
    .transform((val) => (val ? sanitizeXss(val, 100) : null)),
});

export type WebhookLogisticsInput = z.infer<typeof webhookLogisticsSchema>;
