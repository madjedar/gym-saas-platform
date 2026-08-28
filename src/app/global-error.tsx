"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GLOBAL APPLICATION CRASH]:", error);
  }, [error]);

  return (
    <html lang="fr" className="dark">
      <body className="bg-[#09090b] text-white flex items-center justify-center min-h-screen p-6 font-sans">
        <div className="flex flex-col items-center max-w-md text-center">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-6 shadow-xl shadow-rose-500/5">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <h1 className="text-2xl font-bold text-zinc-50 mb-2">Interruption du Service</h1>
          <p className="text-sm text-zinc-400 mb-6">
            Une erreur critique est survenue lors de l'initialisation de l'application.
          </p>

          <button
            onClick={() => reset()}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20"
          >
            <RefreshCw className="w-4 h-4" /> Recharger l'Application
          </button>
        </div>
      </body>
    </html>
  );
}
