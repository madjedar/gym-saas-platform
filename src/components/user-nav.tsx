"use client";

import { signOut } from "next-auth/react";
import { LogOut, UserCircle } from "lucide-react";
import { useState } from "react";

interface UserNavProps {
  user?: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
  isDemo?: boolean;
}

export function UserNav({ user, isDemo }: UserNavProps) {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleSignOut = async () => {
    setLoggingOut(true);
    await signOut({ callbackUrl: "/login" });
  };

  const displayName = user?.name || user?.email?.split("@")[0] || "Gérant";
  const displayEmail = user?.email || "non-connecté";
  const initial = (displayName.charAt(0) || "U").toUpperCase();

  const getRoleLabel = (role?: string | null) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "Super Admin";
      case "GYM_OWNER":
        return "Gérant";
      case "STAFF":
        return "Réception / Staff";
      case "TRAINER":
        return "Coach / Trainer";
      case "MEMBER":
        return "Adhérent";
      default:
        return "Utilisateur";
    }
  };

  return (
    <div className="p-4 border-t border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center font-black text-xs text-zinc-950 shrink-0 shadow-sm shadow-emerald-500/20">
            {initial}
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-bold truncate text-zinc-100">{displayName}</p>
              {isDemo && (
                <span className="text-[9px] font-semibold bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">
                  Démo
                </span>
              )}
            </div>
            <p className="text-[10px] text-zinc-400 truncate">{displayEmail}</p>
            <span className="text-[10px] font-medium text-emerald-400 block mt-0.5">
              {getRoleLabel(user?.role)}
            </span>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          disabled={loggingOut}
          title="Se déconnecter"
          className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-rose-500/20 shrink-0 disabled:opacity-50"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
