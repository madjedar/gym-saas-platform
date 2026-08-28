"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, QrCode, Sparkles, ArrowLeft, ShieldCheck, UserCheck, AlertOctagon } from "lucide-react";
import Link from "next/link";

export default function ScannerPage() {
  const [status, setStatus] = useState<"IDLE" | "GRANTED" | "DENIED">("IDLE");
  const [message, setMessage] = useState<string>("");
  const [memberInfo, setMemberInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleValidateToken = async (token: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/access/validate-qr", {
        method: "POST",
        body: JSON.stringify({ qrToken: token }),
        headers: { "Content-Type": "application/json" }
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus("GRANTED");
        setMessage(data.message || "Accès Autorisé");
        setMemberInfo(data.member);
      } else {
        setStatus("DENIED");
        setMessage(data.error || "Accès Refusé");
        setMemberInfo(data.member);
      }
    } catch (e) {
      setStatus("DENIED");
      setMessage("Erreur de connexion serveur");
    } finally {
      setLoading(false);
      // Reset after 3.5 seconds
      setTimeout(() => {
        setStatus("IDLE");
        setMessage("");
        setMemberInfo(null);
      }, 3500);
    }
  };

  const simulateScan = async (type: "active" | "expired") => {
    try {
      const res = await fetch(`/api/access/validate-qr?type=${type}`);
      const data = await res.json();
      if (data.token) {
        handleValidateToken(data.token);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const bgColor = status === "GRANTED" ? "bg-emerald-600" : status === "DENIED" ? "bg-rose-700" : "bg-[#09090b]";

  return (
    <div className={`h-screen w-full flex flex-col items-center justify-between p-6 transition-colors duration-300 ${bgColor}`}>
      {/* Top bar */}
      <div className="w-full max-w-4xl flex items-center justify-between z-20">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold backdrop-blur-md transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Retour au Tableau de Bord
        </Link>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-[11px] font-medium text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Scanner Kiosk Connecté
        </div>
      </div>

      {/* Center Display */}
      {status === "IDLE" ? (
        <div className="w-full max-w-md p-8 bg-zinc-900/70 backdrop-blur-2xl rounded-3xl border border-zinc-800/80 shadow-2xl flex flex-col items-center z-10">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <QrCode className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Contrôle d'Accès QR</h1>
          </div>
          <p className="text-zinc-400 text-xs text-center mb-8">
            Présentez le QR Code dynamique de l'application mobile devant la caméra.
          </p>

          {/* Viewfinder Target */}
          <div className="w-64 h-64 bg-zinc-950 rounded-3xl border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center mb-8 relative overflow-hidden shadow-inner">
            <div className="w-44 h-44 relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
            </div>

            {/* Laser scan animation */}
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-400/80 shadow-[0_0_20px_rgba(16,185,129,0.8)] animate-[scan_2s_ease-in-out_infinite]" />

            <span className="absolute bottom-4 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
              Détecteur Actif
            </span>
          </div>

          {/* Quick Simulation Buttons */}
          <div className="w-full space-y-2.5">
            <p className="text-[11px] font-semibold text-zinc-400 text-center uppercase tracking-wider">
              Tester la Vérification en 1-Clic
            </p>

            <button
              onClick={() => simulateScan("active")}
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
            >
              <UserCheck className="w-4 h-4" />
              Simuler Passage Membre Valide (Yacine Benali)
            </button>

            <button
              onClick={() => simulateScan("expired")}
              disabled={loading}
              className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-rose-400 font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 border border-zinc-700 transition-all"
            >
              <AlertOctagon className="w-4 h-4" />
              Simuler Passage Membre Expiré (Mehdi Larbi)
            </button>
          </div>
        </div>
      ) : status === "GRANTED" ? (
        <div className="text-center animate-in zoom-in-95 duration-200 z-10 max-w-lg">
          <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <CheckCircle2 className="w-14 h-14 text-white" />
          </div>
          <h1 className="text-6xl sm:text-7xl font-black uppercase tracking-tight text-white drop-shadow-lg mb-4">
            ACCÈS AUTORISÉ
          </h1>
          <p className="text-2xl font-bold text-white/95">{message}</p>
          {memberInfo && (
            <div className="mt-4 inline-block px-4 py-2 rounded-xl bg-black/30 backdrop-blur-md text-white font-medium text-sm">
              Formule : {memberInfo.plan} ({memberInfo.daysLeft} jours restants)
            </div>
          )}
        </div>
      ) : (
        <div className="text-center animate-in zoom-in-95 duration-200 z-10 max-w-lg">
          <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <XCircle className="w-14 h-14 text-white" />
          </div>
          <h1 className="text-6xl sm:text-7xl font-black uppercase tracking-tight text-white drop-shadow-lg mb-4">
            ACCÈS REFUSÉ
          </h1>
          <p className="text-2xl font-bold text-white/95">{message}</p>
          <p className="text-sm text-white/75 mt-2">Veuillez régulariser l'abonnement à l'accueil.</p>
        </div>
      )}

      {/* Bottom Footer info */}
      <div className="text-center text-[11px] text-zinc-500 flex items-center gap-1.5 z-10">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        Vérification cryptographique JWT (60s anti-capture)
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes scan {
          0% { top: 12%; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { top: 88%; opacity: 0; }
        }
      `}} />
    </div>
  );
}
