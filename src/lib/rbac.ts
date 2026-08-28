import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export type Role = "SUPER_ADMIN" | "GYM_OWNER" | "STAFF" | "TRAINER" | "MEMBER";

export interface AuthorizedUser {
  id: string;
  email: string;
  role: Role;
  gymId: string;
  name?: string | null;
  gymName?: string | null;
}

/**
 * Validates that the current user is authenticated and possesses one of the allowed roles.
 * If unauthorized, throws an error or redirects to login.
 */
export async function requireAuthUser(allowedRoles?: Role[]): Promise<AuthorizedUser> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.role) {
    redirect("/login?error=Unauthenticated");
  }

  const user = session.user as AuthorizedUser;

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      throw new Error(`Accès non autorisé : Le rôle '${user.role}' n'a pas la permission requise.`);
    }
  }

  return user;
}

/**
 * Asserts that the authenticated user belongs to the target gym or is a SUPER_ADMIN.
 * Prevents cross-tenant data tampering.
 */
export async function assertTenantAccess(targetGymId: string): Promise<AuthorizedUser> {
  const user = await requireAuthUser();

  if (user.role !== "SUPER_ADMIN" && user.gymId !== targetGymId) {
    throw new Error("Violation de frontière Multi-Tenant : Vous ne pouvez pas modifier les données d'un autre établissement.");
  }

  return user;
}

/**
 * Permission checker for UI components and server validations.
 */
export function hasPermission(
  role: string | null | undefined,
  action: "delete_member" | "manage_plans" | "edit_gym_settings" | "manage_staff" | "view_financials" | "operate_pos" | "scan_qr"
): boolean {
  if (!role) return false;
  if (role === "SUPER_ADMIN") return true;

  switch (action) {
    case "edit_gym_settings":
    case "manage_plans":
    case "delete_member":
    case "manage_staff":
    case "view_financials":
      return role === "GYM_OWNER";

    case "operate_pos":
    case "scan_qr":
      return role === "GYM_OWNER" || role === "STAFF";

    default:
      return false;
  }
}
