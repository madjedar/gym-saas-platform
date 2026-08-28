import { getTenantGym } from "@/lib/tenant";
import Link from "next/link";
import { LayoutDashboard, Users, ShoppingCart, Settings, Camera } from "lucide-react";
import { UserNav } from "@/components/user-nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getTenantGym();
  const gym = tenant?.gym;
  const user = tenant?.user;

  const isOwnerOrAdmin = user?.role === "GYM_OWNER" || user?.role === "SUPER_ADMIN";

  return (
    <div className="flex h-screen bg-[#09090b] text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-[#09090b] flex flex-col relative z-10 shrink-0">
        <div className="p-6 border-b border-zinc-800">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-black text-zinc-950 text-sm">
              G
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter text-emerald-500 flex items-center leading-none">
                GYM<span className="text-white">OS</span>
              </h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mt-1">Enterprise SaaS</p>
            </div>
          </Link>

          {gym && (
            <div className="mt-4 p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
              <p className="text-xs font-semibold text-zinc-200 truncate">{gym.name}</p>
              <p className="text-[10px] text-emerald-400 font-medium">{gym.subscriptionTier || 'PRO'} TENANT</p>
            </div>
          )}
        </div>
        
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <Link 
            href="/dashboard" 
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors text-sm font-medium"
          >
            <LayoutDashboard className="w-4 h-4 text-emerald-500" /> Vue d'ensemble
          </Link>
          <Link 
            href="/dashboard/members" 
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors text-sm font-medium"
          >
            <Users className="w-4 h-4 text-emerald-500" /> Membres & Abonnements
          </Link>
          <Link 
            href="/dashboard/pos" 
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors text-sm font-medium"
          >
            <ShoppingCart className="w-4 h-4 text-emerald-500" /> Caisse & Boutique (POS)
          </Link>
          <Link 
            href="/reception/scanner" 
            target="_blank" 
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors text-sm font-medium"
          >
            <Camera className="w-4 h-4 text-emerald-500" /> Scanner Réception (QR)
          </Link>
          
          {isOwnerOrAdmin && (
            <Link 
              href="/dashboard/settings" 
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors text-sm font-medium"
            >
              <Settings className="w-4 h-4 text-emerald-500" /> Paramètres & Tarifs
            </Link>
          )}
        </nav>

        {/* User Navigation Footer */}
        <UserNav user={user} isDemo={tenant?.isDemo} />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-[#09090b]">
        {children}
      </main>
    </div>
  );
}
