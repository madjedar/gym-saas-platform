"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Dumbbell, ShieldCheck, ArrowRight, Sparkles, Lock, Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import React, { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("owner@atlasgym.dz");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    urlError === "UnauthorizedRole" 
      ? "Accès refusé : Votre rôle n'a pas les autorisations nécessaires pour cet espace." 
      : null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Identifiants incorrects. Veuillez vérifier l'email et le mot de passe.");
      setLoading(false);
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  };

  const handleQuickLogin = async (targetEmail: string, targetPass: string = "password123") => {
    setEmail(targetEmail);
    setPassword(targetPass);
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      email: targetEmail,
      password: targetPass,
      redirect: false,
    });

    if (res?.error) {
      setError("Échec de connexion au compte démo.");
      setLoading(false);
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  };

  return (
    <div className="w-full max-w-md relative z-10">
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-xl shadow-emerald-500/20 mb-3.5 border border-emerald-400/30">
          <Dumbbell className="w-8 h-8 text-zinc-950" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-1">
          GYM<span className="text-emerald-500">OS</span>
        </h1>
        <p className="text-zinc-400 text-sm mt-1 text-center">
          Plateforme SaaS Multi-Tenant pour Salles de Sport
        </p>
      </div>

      {/* Main Login Card */}
      <div className="bg-zinc-900/80 border border-zinc-800 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white tracking-tight">Espace Authentification</h2>
          <p className="text-xs text-zinc-400 mt-1">Connectez-vous pour gérer votre établissement.</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl text-rose-400 text-xs flex items-start gap-2.5 leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Email Professionnel
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-emerald-500 transition-colors"
                placeholder="owner@atlasgym.dz"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Mot de Passe
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-emerald-500 transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.99]"
          >
            {loading ? "Vérification..." : "Se Connecter"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Access Options */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-zinc-900 px-3 text-zinc-500 font-semibold tracking-wider">
              Accès Démo 1-Clic
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => handleQuickLogin("owner@atlasgym.dz", "password123")}
            disabled={loading}
            className="w-full bg-zinc-950 hover:bg-zinc-800/80 text-zinc-200 font-medium text-xs py-2.5 px-3 rounded-xl transition-all flex items-center justify-between border border-zinc-800 hover:border-zinc-700"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Gérant (Atlas Fitness Alger)
            </span>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              GYM_OWNER
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin("yacine.benali@gmail.com", "password123")}
            disabled={loading}
            className="w-full bg-zinc-950 hover:bg-zinc-800/80 text-zinc-200 font-medium text-xs py-2.5 px-3 rounded-xl transition-all flex items-center justify-between border border-zinc-800 hover:border-zinc-700"
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              Compte Membre Démo (Yacine B.)
            </span>
            <span className="text-[10px] text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
              MEMBER
            </span>
          </button>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        Sécurité JWT NextAuth & Chiffrement Haché Bcrypt
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col justify-center items-center p-4 relative">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px]" />
      </div>

      <Suspense fallback={<div className="text-zinc-500 text-sm">Chargement...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
