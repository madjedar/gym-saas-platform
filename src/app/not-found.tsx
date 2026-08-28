import Link from "next/link";
import { AlertCircle, ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#09090b] text-white p-6">
      <div className="flex flex-col items-center max-w-md text-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-6 shadow-xl shadow-amber-500/5">
          <AlertCircle className="w-8 h-8" />
        </div>

        <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 mb-3">
          Erreur 404
        </span>

        <h1 className="text-3xl font-black tracking-tight text-zinc-50 mb-2">Page Introuvable</h1>
        <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
          La page que vous recherchez n'existe pas ou a été déplacée. Veuillez vérifier l'adresse ou revenir au tableau de bord.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20"
          >
            <Home className="w-4 h-4" /> Tableau de Bord
          </Link>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-semibold rounded-xl text-xs border border-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Se Connecter
          </Link>
        </div>
      </div>
    </div>
  );
}
