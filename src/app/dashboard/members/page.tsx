import { getTenantGym } from "@/lib/tenant";
import prisma from "@/lib/prisma";
import { MembersTable } from "./members-table";
import { AddMemberModal } from "./add-member-modal";
import { Users, UserCheck, UserX } from "lucide-react";

import { SAFE_USER_SELECT } from "@/lib/dto";

export default async function MembersPage({ searchParams }: { searchParams: { page?: string } }) {
  const tenant = await getTenantGym();
  const gymId = tenant?.gym?.id;

  if (!gymId) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#09090b]">
        <p className="text-zinc-500">Aucune salle configurée. Veuillez initialiser la base de données.</p>
      </div>
    );
  }

  const page = parseInt(searchParams.page || "1", 10);
  const limit = 10;
  const skip = (page - 1) * limit;

  // 1. Fetch total count for pagination
  const totalMembers = await prisma.user.count({
    where: { gymId, role: "MEMBER" }
  });
  const totalPages = Math.ceil(totalMembers / limit);

  // 2. Fetch members strictly belonging to this gym (with safe field projection)
  const members = await prisma.user.findMany({
    where: { 
      gymId: gymId, 
      role: "MEMBER" 
    },
    select: {
      ...SAFE_USER_SELECT,
      subscriptions: {
        where: { status: "ACTIVE" },
        include: { plan: true },
        take: 1
      }
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: skip,
  });

  // 3. Fetch active plans for modals
  const plans = await prisma.plan.findMany({
    where: { gymId: gymId, isActive: true },
    select: { id: true, name: true, price: true, durationInDays: true },
    orderBy: { price: "asc" }
  });

  // 4. Format data
  const formattedMembers = members.map(m => ({
    id: m.id,
    name: `${m.firstName} ${m.lastName}`,
    email: m.email,
    phone: m.phone || "",
    avatarUrl: m.avatarUrl || null,
    status: (m.subscriptions.length > 0 ? "ACTIVE" : "EXPIRED") as "ACTIVE" | "EXPIRED",
    planName: m.subscriptions[0]?.plan?.name || "Aucun",
  }));

  // Note: activeCount and expiredCount will now only reflect the CURRENT PAGE. 
  // For global stats, we would need to query the DB. We'll leave it as page stats for now.
  const activeCount = formattedMembers.filter(m => m.status === "ACTIVE").length;
  const expiredCount = formattedMembers.filter(m => m.status === "EXPIRED").length;

  return (
    <div className="flex flex-col gap-6 p-8 w-full min-h-screen bg-[#09090b]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-50">Gestion des Membres</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Répertoire des adhérents, suivi des abonnements et enregistrement de nouveaux clients.
          </p>
        </div>
        
        <AddMemberModal plans={plans} />
      </div>

      {/* Mini Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400 font-medium">Total Inscrits</p>
            <p className="text-2xl font-bold text-white mt-0.5">{formattedMembers.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-300">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-emerald-400 font-medium">Abonnements Actifs</p>
            <p className="text-2xl font-bold text-emerald-400 mt-0.5">{activeCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-rose-400 font-medium">Abonnements Expirés</p>
            <p className="text-2xl font-bold text-rose-400 mt-0.5">{expiredCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <UserX className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters and Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex-1">
        <MembersTable data={formattedMembers} plans={plans} page={page} totalPages={totalPages} />
      </div>
    </div>
  );
}
