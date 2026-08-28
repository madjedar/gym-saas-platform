"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuthUser } from "@/lib/rbac";
import { fileUploadSchema } from "@/lib/validations";
import { handleServerActionError, ValidationError } from "@/lib/errors";
import { put } from "@vercel/blob";
import crypto from "crypto";

export async function uploadGymLogo(formData: FormData) {
  try {
    const authUser = await requireAuthUser(["GYM_OWNER", "SUPER_ADMIN"]);
    
    const file = formData.get("file") as File;
    if (!file || !(file instanceof File)) {
      throw new ValidationError("Aucun fichier n'a été fourni");
    }

    // Secure validation: check file size and MIME type on the server
    const parsedFile = fileUploadSchema.safeParse(file);
    if (!parsedFile.success) {
      throw new ValidationError(parsedFile.error.issues[0]?.message || "Fichier invalide");
    }

    // Cryptographic renaming to prevent path traversal and collisions
    const extension = file.name.split(".").pop();
    const secureFileName = `gym-logos/${crypto.randomUUID()}.${extension}`;

    // Upload to Vercel Blob
    const blob = await put(secureFileName, file, {
      access: "public",
      addRandomSuffix: false, // We already use a secure UUID
    });

    // Save URL to database
    await prisma.gym.update({
      where: { id: authUser.gymId },
      data: { logoUrl: blob.url },
    });

    revalidatePath("/dashboard/settings");
    return { success: true, url: blob.url };
  } catch (error) {
    return handleServerActionError(error);
  }
}
