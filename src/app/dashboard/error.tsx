"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw, LayoutDashboard } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[DASHBOARD VIEW ERROR]:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center p-12 w-full min-h-[70vh] bg-[#09090b] text-white">
      <div className="flex flex-col items-center max-w-md text-center bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-8 shadow-2xl backdrop-blur-sm">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-5 shadow-lg shadow-amber-500/5">
          <AlertCircle className="w-7 h-7" />
        </div>

        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 mb-3">
          Erreur Tableau de Bord
        </span>

        <h2 className="text-xl font-bold text-zinc-100 mb-2">
          Chargement impossible de cette section
        </h2>
        <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
          Une difficulté est survenue lors de la synchronisation des données de votre salle. Veuillez réessayer.
        </p>

        {error.digest && (
          <p className="text-[10px] font-mono text-zinc-600 mb-6 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800/60">
            ID d'erreur : {error.digest}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={() => reset()}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20"
          >
            <RefreshCw className="w-4 h-4" /> Réactualiser
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold rounded-xl text-xs border border-zinc-700/60 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" /> Accueil Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
