import { getTenantGym } from "@/lib/tenant";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Users, CreditCard, TrendingUp, Activity, ArrowUpRight, ShoppingBag, QrCode } from "lucide-react";

import { SAFE_USER_SELECT } from "@/lib/dto";
import { MemberPass } from "@/components/member-pass";

export default async function DashboardPage() {
  const tenant = await getTenantGym();
  const gymId = tenant?.gym?.id;
  const user = tenant?.user;

  // Render dedicated Member Space for MEMBER role
  if (user?.role === "MEMBER") {
    const memberData = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        subscriptions: {
          where: { status: "ACTIVE" },
          include: { plan: true },
          orderBy: { endDate: "desc" },
          take: 1
        },
        attendanceLogs: {
          where: { gymId: gymId || undefined },
          orderBy: { checkInTime: "desc" },
          take: 5
        }
      }
    });

    const activeSub = memberData?.subscriptions[0];
    const daysRemaining = activeSub
      ? Math.max(0, Math.ceil((new Date(activeSub.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0;

    return (
      <MemberPass
        user={{
          id: user.id,
          name: user.name || undefined,
          email: user.email || undefined,
        }}
        gymName={tenant?.gym?.name}
        subscription={
          activeSub
            ? {
                planName: activeSub.plan.name,
                endDate: activeSub.endDate.toISOString(),
                status: activeSub.status,
                daysRemaining,
              }
            : null
        }
        attendanceLogs={(memberData?.attendanceLogs || []).map((log) => ({
          id: log.id,
          checkInTime: log.checkInTime.toISOString(),
        }))}
      />
    );
  }

  let totalMembers = 0;
  let activeSubscriptions = 0;
  let totalRevenue = 0;
  let checkinsToday = 0;
  let recentLogs: any[] = [];
  let recentOrders: any[] = [];

  if (gymId) {
    totalMembers = await prisma.user.count({
      where: { gymId, role: "MEMBER" }
    });

    activeSubscriptions = await prisma.subscription.count({
      where: { gymId, status: "ACTIVE" }
    });

    const ordersSum = await prisma.order.aggregate({
      where: { gymId },
      _sum: { totalAmount: true }
    });

    const subSumResult = await prisma.$queryRaw<Array<{ total: number | null }>>`
      SELECT SUM(p.price) as total
      FROM "Subscription" s
      JOIN "Plan" p ON s."planId" = p.id
      WHERE s."gymId" = ${gymId}
    `;
    
    const totalSubRevenue = Number(subSumResult[0]?.total || 0);
    totalRevenue = (ordersSum._sum.totalAmount || 0) + totalSubRevenue;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    checkinsToday = await prisma.attendanceLog.count({
      where: {
        gymId,
        checkInTime: { gte: startOfDay }
      }
    });

    recentLogs = await prisma.attendanceLog.findMany({
      where: { gymId },
      include: { 
        user: { 
          select: SAFE_USER_SELECT 
        } 
      },
      orderBy: { checkInTime: "desc" },
      take: 5
    });

    recentOrders = await prisma.order.findMany({
      where: { gymId },
      include: { 
        user: { 
          select: SAFE_USER_SELECT 
        }, 
        items: { include: { product: true } } 
      },
      orderBy: { id: "desc" },
      take: 5
    });
  }

  const stats = [
    { label: "Total Membres", value: totalMembers.toString(), icon: Users, change: "+12%", color: "emerald" },
    { label: "Abonnements Actifs", value: activeSubscriptions.toString(), icon: CreditCard, change: "+8%", color: "emerald" },
    { label: "Chiffre d'Affaires", value: `${totalRevenue.toLocaleString()} DZD`, icon: TrendingUp, change: "+24%", color: "emerald" },
    { label: "Entrées Aujourd'hui", value: checkinsToday.toString(), icon: Activity, change: "+5%", color: "emerald" },
  ];

  return (
    <div className="flex flex-col gap-8 p-8 w-full min-h-screen bg-[#09090b]">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-50">
              Tableau de Bord
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {tenant?.gym?.name || "Atlas Gym"}
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Performance en direct et gestion en temps réel de votre établissement.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/reception/scanner"
            target="_blank"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 text-white font-medium text-sm transition-all"
          >
            <QrCode className="w-4 h-4 text-emerald-400" />
            Scanner QR
          </Link>
          <Link
            href="/dashboard/pos"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20"
          >
            <ShoppingBag className="w-4 h-4" />
            Nouvelle Vente
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 hover:border-zinc-700/80 transition-all hover:shadow-xl"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{stat.label}</span>
              <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center">
                <stat.icon className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <p className="text-3xl font-black text-white tracking-tight">{stat.value}</p>
            <p className="text-xs text-emerald-400 mt-2 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
              {stat.change} ce mois-ci
            </p>
          </div>
        ))}
      </div>

      {/* Quick Actions & Live Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white mb-1">Accès Rapides</h2>
            <p className="text-xs text-zinc-400 mb-4">Actions prioritaires pour le personnel</p>

            <div className="space-y-3">
              <Link
                href="/dashboard/members"
                className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 hover:border-emerald-500/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span className="text-zinc-200 text-sm font-medium">Gérer les Adhérents</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
              </Link>

              <Link
                href="/dashboard/pos"
                className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 hover:border-emerald-500/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <span className="text-zinc-200 text-sm font-medium">Caisse & E-Boutique</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
              </Link>

              <Link
                href="/dashboard/settings"
                className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 hover:border-emerald-500/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-zinc-200 text-sm font-medium">Tarifs des Abonnements</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
              </Link>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20">
            <p className="text-xs font-semibold text-emerald-400">Scanner Kiosk Actif</p>
            <p className="text-[11px] text-zinc-400 mt-1">Le lecteur QR vérifie instantanément les abonnements en 60ms.</p>
          </div>
        </div>

        {/* Live Attendance Log */}
        <div className="lg:col-span-2 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white">Derniers Passages Réception</h2>
              <p className="text-xs text-zinc-400">Journal des accès validés par QR Code</p>
            </div>
            <Link href="/reception/scanner" target="_blank" className="text-xs text-emerald-400 hover:underline">
              Ouvrir le Scanner →
            </Link>
          </div>

          <div className="space-y-2.5">
            {recentLogs.length > 0 ? (
              recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold text-xs text-emerald-400">
                      {log.user?.firstName?.charAt(0) || "M"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">
                        {log.user?.firstName} {log.user?.lastName}
                      </p>
                      <p className="text-[11px] text-zinc-500">{log.user?.email}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Accès Autorisé
                    </span>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      {new Date(log.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-zinc-500 text-sm py-8 text-center">Aucun passage enregistré aujourd'hui</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
