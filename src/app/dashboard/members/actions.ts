"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuthUser } from "@/lib/rbac";
import { addMemberSchema, assignPlanSchema, fileUploadSchema } from "@/lib/validations";
import { hashPassword } from "@/lib/password";
import { handleServerActionError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { put } from "@vercel/blob";
import crypto from "crypto";

export async function addMember(formData: FormData) {
  try {
    // Authorization check: Only STAFF, GYM_OWNER, and SUPER_ADMIN can add members
    const authUser = await requireAuthUser(["STAFF", "GYM_OWNER", "SUPER_ADMIN"]);
    const gymId = authUser.gymId;

    // 1. Validate Form Inputs with Zod Schema
    const rawData = {
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      phone: formData.get("phone") || undefined,
      planId: formData.get("planId") || undefined,
    };

    const validationResult = addMemberSchema.safeParse(rawData);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues.map(e => e.message).join(". ");
      throw new ValidationError(errorMessage);
    }

    const { firstName, lastName, email, phone, planId } = validationResult.data;

    // 2. Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new ValidationError("Un membre avec cette adresse email est déjà inscrit.");
    }

    // 3. Generate hashed default password (work factor 12) for member mobile access
    const defaultPasswordHash = await hashPassword("password123");

    // 4. Create Member and optional subscription in an Atomic Transaction
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          gymId,
          firstName,
          lastName,
          email,
          phone: phone || null,
          role: "MEMBER",
          passwordHash: defaultPasswordHash,
        }
      });

      // 5. If a plan was selected during creation, validate and assign it immediately
      if (planId && planId !== "none") {
        const plan = await tx.plan.findFirst({
          where: { id: planId, gymId, isActive: true }
        });

        if (plan) {
          const startDate = new Date();
          const endDate = new Date();
          endDate.setDate(startDate.getDate() + plan.durationInDays);

          await tx.subscription.create({
            data: {
              userId: user.id,
              planId: plan.id,
              gymId,
              startDate,
              endDate,
              status: "ACTIVE",
              paymentStatus: "PAID"
            }
          });

          await tx.transaction.create({
            data: {
              gymId,
              userId: user.id,
              amount: plan.price,
              type: "MEMBERSHIP",
              method: "CASH"
            }
          });
        }
      }
      
      return user;
    });

    logger.info('MEMBER_ADDED', { gymId, memberId: newUser.id, actorId: authUser.id });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/members");
  } catch (error) {
    handleServerActionError(error, "Échec de l'inscription du membre");
  }
}

export async function assignPlan(formData: FormData) {
  try {
    // Authorization check: Only STAFF, GYM_OWNER, and SUPER_ADMIN can assign plans
    const authUser = await requireAuthUser(["STAFF", "GYM_OWNER", "SUPER_ADMIN"]);
    const gymId = authUser.gymId;

    // 1. Validate Form Inputs with Zod Schema
    const rawData = {
      memberId: formData.get("memberId"),
      planId: formData.get("planId"),
    };

    const validationResult = assignPlanSchema.safeParse(rawData);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues.map(e => e.message).join(". ");
      throw new ValidationError(errorMessage);
    }

    const { memberId, planId } = validationResult.data;

    // 2. Ensure the target member belongs to caller's gym
    const targetMember = await prisma.user.findFirst({
      where: { id: memberId, gymId }
    });

    if (!targetMember) {
      throw new ValidationError("Membre introuvable dans votre établissement");
    }

    // 3. Ensure the target plan belongs to caller's gym
    const plan = await prisma.plan.findFirst({
      where: { id: planId, gymId, isActive: true }
    });

    if (!plan) {
      throw new ValidationError("Formule d'abonnement introuvable ou inactive");
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + plan.durationInDays);

    await prisma.$transaction(async (tx) => {
      // Update previous active subscriptions to expired
      await tx.subscription.updateMany({
        where: { userId: memberId, gymId, status: "ACTIVE" },
        data: { status: "EXPIRED" }
      });

      // Create new subscription
      await tx.subscription.create({
        data: {
          userId: memberId,
          planId: planId,
          gymId,
          startDate,
          endDate,
          status: "ACTIVE",
          paymentStatus: "PAID"
        }
      });

      // Log transaction
      await tx.transaction.create({
        data: {
          gymId,
          userId: memberId,
          amount: plan.price,
          type: "MEMBERSHIP",
          method: "CASH"
        }
      });
    });

    logger.info('PLAN_ASSIGNED', { gymId, memberId, planId, actorId: authUser.id });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/members");
  } catch (error) {
    handleServerActionError(error, "Échec de l'assignation du forfait");
  }
}

export async function deleteMember(memberId: string) {
  try {
    // Authorization check: STRICTLY restricted to GYM_OWNER and SUPER_ADMIN
    const authUser = await requireAuthUser(["GYM_OWNER", "SUPER_ADMIN"]);
    const gymId = authUser.gymId;

    if (!memberId || typeof memberId !== "string" || memberId.trim().length < 5) {
      throw new ValidationError("Identifiant de membre invalide");
    }

    // Verify target member belongs to caller's gym
    const targetMember = await prisma.user.findFirst({
      where: { id: memberId.trim(), gymId }
    });

    if (!targetMember) {
      throw new ValidationError("Membre introuvable ou n'appartient pas à votre établissement");
    }

    // 3. Delete Member (PostgreSQL will automatically cascade and delete Subscriptions, Logs, Orders, etc.)
    await prisma.user.delete({
      where: { id: memberId, gymId }
    });

    logger.info('MEMBER_DELETED', { gymId, memberId, actorId: authUser.id, actorRole: authUser.role });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/members");
  } catch (error) {
    handleServerActionError(error, "Échec de la suppression du membre");
  }
}

export async function uploadMemberAvatar(formData: FormData) {
  try {
    const authUser = await requireAuthUser(["STAFF", "GYM_OWNER", "SUPER_ADMIN"]);
    const gymId = authUser.gymId;
    
    const memberId = formData.get("memberId") as string;
    if (!memberId) {
      throw new ValidationError("ID du membre manquant");
    }

    const file = formData.get("file") as File;
    if (!file || !(file instanceof File)) {
      throw new ValidationError("Aucun fichier n'a été fourni");
    }

    // Verify member belongs to the gym
    const member = await prisma.user.findFirst({
      where: { id: memberId, gymId: gymId }
    });
    if (!member) {
      throw new ValidationError("Membre introuvable");
    }

    // Secure validation: check file size and MIME type on the server
    const parsedFile = fileUploadSchema.safeParse(file);
    if (!parsedFile.success) {
      throw new ValidationError(parsedFile.error.issues[0]?.message || "Fichier invalide");
    }

    // Cryptographic renaming to prevent path traversal and collisions
    const extension = file.name.split(".").pop();
    const secureFileName = `avatars/${crypto.randomUUID()}.${extension}`;

    // Upload to Vercel Blob
    const blob = await put(secureFileName, file, {
      access: "public",
      addRandomSuffix: false, // We already use a secure UUID
    });

    // Save URL to database
    await prisma.user.update({
      where: { id: memberId },
      data: { avatarUrl: blob.url },
    });

    revalidatePath("/dashboard/members");
    return { success: true, url: blob.url };
  } catch (error) {
    return handleServerActionError(error);
  }
}
