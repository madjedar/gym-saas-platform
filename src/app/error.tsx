"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log sanitized error trace securely
    console.error("[APPLICATION ROOT ERROR]:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#09090b] text-white p-6">
      <div className="flex flex-col items-center max-w-md text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-6 shadow-xl shadow-rose-500/5">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <span className="text-xs font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20 mb-3">
          Erreur d'Application
        </span>

        <h1 className="text-2xl font-black tracking-tight text-zinc-50 mb-2">
          Une erreur inattendue est survenue
        </h1>
        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
          Le système a rencontré une difficulté temporaire. Vos données sont préservées en toute sécurité.
        </p>

        {error.digest && (
          <p className="text-[10px] font-mono text-zinc-600 mb-6 bg-zinc-900/50 px-3 py-1.5 rounded-lg border border-zinc-800">
            Identifiant d'incident : {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
          <button
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20"
          >
            <RefreshCw className="w-4 h-4" /> Réessayer
          </button>
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-semibold rounded-xl text-xs border border-zinc-800 transition-colors"
          >
            <Home className="w-4 h-4" /> Tableau de Bord
          </Link>
        </div>
      </div>
    </div>
  );
}
