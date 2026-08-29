"use client";

import React, { useState, useEffect } from "react";
import { QrCode, ShieldCheck, Clock, Calendar, CheckCircle2, Sparkles, AlertCircle } from "lucide-react";
import Image from "next/image";

interface MemberPassProps {
  user: {
    id: string;
    name?: string;
    email?: string;
  };
  gymName?: string;
  subscription?: {
    planName: string;
    endDate: string;
    status: string;
    daysRemaining: number;
  } | null;
  attendanceLogs?: Array<{
    id: string;
    checkInTime: string;
  }>;
}

export function MemberPass({ user, gymName, subscription, attendanceLogs = [] }: MemberPassProps) {
  const [secondsLeft, setSecondsLeft] = useState(60);

  // Dynamic 60-second QR refresh simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 60 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hasActiveSub = subscription && subscription.daysRemaining > 0;

  return (
    <div className="flex flex-col gap-8 p-6 sm:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight text-white">Espace Membre</h1>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Pass Numérique
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Présentez votre QR Pass à l'accueil pour accéder aux installations de <strong className="text-zinc-200">{gymName || "votre club"}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          Membre Connecté
        </div>
      </div>

      {/* Main Grid: Pass & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Digital Membership Pass Card */}
        <div className="lg:col-span-5 w-full flex flex-col items-center">
          <div className="w-full bg-gradient-to-b from-zinc-900 to-zinc-950 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl shadow-emerald-500/10 flex flex-col items-center relative overflow-hidden">
            {/* Top Glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Club Logo & Name */}
            <div className="flex items-center justify-between w-full mb-6 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md shadow-emerald-500/20 border border-emerald-500/30">
                  <Image src="/logo.png" alt="GymOS" width={36} height={36} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white leading-none">GYM<span className="text-emerald-500">OS</span></h3>
                  <p className="text-[10px] text-zinc-400 font-medium">{gymName || "Atlas Fitness Alger"}</p>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                {hasActiveSub ? "Valide" : "Expiré"}
              </span>
            </div>

            {/* QR Code Frame */}
            <div className="w-56 h-56 bg-zinc-950 rounded-2xl border-2 border-dashed border-emerald-500/40 p-4 flex flex-col items-center justify-center relative shadow-inner mb-6">
              <QrCode className="w-40 h-40 text-emerald-400" />
              
              {/* Scan Beam */}
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-400/80 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-scan" />
            </div>

            {/* Anti-screenshot timer */}
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300 bg-zinc-900/90 px-4 py-2 rounded-xl border border-zinc-800 mb-6">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              Actualisation dans <span className="text-emerald-400 font-mono font-bold">{secondsLeft}s</span>
            </div>

            {/* Member Info Footer */}
            <div className="w-full border-t border-zinc-800/80 pt-4 flex flex-col gap-1 text-center">
              <p className="text-base font-bold text-white">{user.name || "Adhérent GymOS"}</p>
              <p className="text-xs text-zinc-400">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Subscription & History Column */}
        <div className="lg:col-span-7 flex flex-col gap-6 w-full">
          {/* Subscription Status Card */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-6 backdrop-blur-xl">
            <h2 className="text-lg font-bold text-white mb-1">Abonnement Actuel</h2>
            <p className="text-xs text-zinc-400 mb-6">Détails de votre formule souscrite au club</p>

            {hasActiveSub ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-950/80 border border-emerald-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{subscription.planName}</h4>
                      <p className="text-xs text-zinc-400">Accès Musculation, Cardio & Espace Vestiaires</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-emerald-400">{subscription.daysRemaining}</span>
                    <span className="text-xs text-zinc-400 block">jours restants</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800">
                    <span className="text-[11px] font-semibold uppercase text-zinc-500">Statut du Pass</span>
                    <p className="text-sm font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Actif & Autorisé
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800">
                    <span className="text-[11px] font-semibold uppercase text-zinc-500">Date d'Échéance</span>
                    <p className="text-sm font-bold text-zinc-200 mt-1 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-zinc-400" />
                      {new Date(subscription.endDate).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-rose-400">Aucun abonnement actif</h4>
                  <p className="text-xs text-zinc-300 mt-1">
                    Veuillez renouveler votre formule auprès de l'accueil de votre salle de sport pour réactiver votre QR Pass.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Recent Check-In Attendance */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-6 backdrop-blur-xl">
            <h2 className="text-lg font-bold text-white mb-1">Historique de vos Passages</h2>
            <p className="text-xs text-zinc-400 mb-4">Vos dernières entrées enregistrées par le scanner</p>

            <div className="space-y-2.5">
              {attendanceLogs.length > 0 ? (
                attendanceLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/60">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-zinc-200">Passage Validé</p>
                        <p className="text-[11px] text-zinc-500">
                          {new Date(log.checkInTime).toLocaleDateString("fr-FR", {
                            weekday: "short",
                            day: "numeric",
                            month: "short"
                          })}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-emerald-400 font-bold">
                      {new Date(log.checkInTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-500 py-4 text-center">Aucun passage récent enregistré</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
