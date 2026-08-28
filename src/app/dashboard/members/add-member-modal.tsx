"use client";

import { useState } from "react";
import { addMember } from "./actions";
import { Plus, X, User, Mail, Phone, CreditCard, Sparkles } from "lucide-react";

type Plan = {
  id: string;
  name: string;
  price: number;
  durationInDays: number;
};

export function AddMemberModal({ plans = [] }: { plans?: Plan[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    
    try {
      await addMember(formData);
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message || "Échec de l'ajout du membre");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 text-sm"
      >
        <Plus className="w-4 h-4" />
        Inscrire un Membre
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#09090b] border border-zinc-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Nouveau Membre</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Remplissez les informations pour créer le profil de l'adhérent.</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {error && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Prénom</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      required 
                      name="firstName" 
                      type="text" 
                      placeholder="Amine"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 transition-colors" 
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Nom</label>
                  <input 
                    required 
                    name="lastName" 
                    type="text" 
                    placeholder="Boudiaf"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 transition-colors" 
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Adresse Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    required 
                    name="email" 
                    type="email" 
                    placeholder="amine.boudiaf@gmail.com"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 transition-colors" 
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Numéro de Téléphone</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    name="phone" 
                    type="tel" 
                    placeholder="0550 12 34 56"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 transition-colors" 
                  />
                </div>
              </div>

              {/* Initial Plan Assignment */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Formule d'Abonnement Initiale</span>
                  <span className="text-emerald-400 text-[10px] font-normal">Optionnel</span>
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select 
                    name="planId" 
                    defaultValue="none"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-8 py-2.5 text-sm text-white outline-none focus:border-emerald-500 transition-colors appearance-none cursor-pointer"
                  >
                    <option value="none">-- Aucun abonnement immédiat --</option>
                    {plans.map(plan => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} ({plan.durationInDays} jours) - {plan.price.toLocaleString()} DZD
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-zinc-800">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={isPending}
                  className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold px-5 py-2.5 rounded-xl transition-all text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  {isPending ? "Enregistrement..." : "Confirmer l'Inscription"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
