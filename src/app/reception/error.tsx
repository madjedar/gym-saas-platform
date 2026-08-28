"use client";

import { useEffect } from "react";
import { QrCode, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ReceptionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[RECEPTION SCANNER ERROR]:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#09090b] text-white p-6">
      <div className="flex flex-col items-center max-w-md text-center bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-6 shadow-lg shadow-rose-500/5">
          <QrCode className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-bold text-zinc-50 mb-2">Erreur du Scanner d'Entrée</h1>
        <p className="text-sm text-zinc-400 mb-6">
          Une erreur est survenue lors de l'initialisation du terminal de scan. Veuillez réinitialiser le scanner.
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={() => reset()}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20"
          >
            <RefreshCw className="w-4 h-4" /> Réinitialiser Scanner
          </button>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold rounded-xl text-xs border border-zinc-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
        </div>
      </div>
    </div>
  );
}
