import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function getTenantGym() {
  const session = await getServerSession(authOptions);

  if (session?.user?.gymId) {
    const gym = await prisma.gym.findUnique({
      where: { id: session.user.gymId }
    });
    if (gym) {
      return { 
        gym, 
        user: session.user, 
        isDemo: false 
      };
    }
  }

  // Fallback for demo/preview if database exists
  const defaultGym = await prisma.gym.findFirst({
    include: {
      users: {
        where: { role: "GYM_OWNER" },
        take: 1
      }
    }
  });

  if (defaultGym) {
    const owner = defaultGym.users[0];
    return {
      gym: defaultGym,
      user: {
        id: owner?.id || "demo-owner",
        email: owner?.email || "owner@atlasgym.dz",
        role: owner?.role || "GYM_OWNER",
        gymId: defaultGym.id,
        name: owner ? `${owner.firstName} ${owner.lastName}` : "Karim Brahimi"
      },
      isDemo: true
    };
  }

  return null;
}

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}
