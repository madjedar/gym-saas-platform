"use client";

import { useState } from "react";
import { MoreHorizontal, Calendar, Trash2, CheckCircle2, History, X, AlertTriangle, ImagePlus } from "lucide-react";
import { assignPlan, deleteMember, uploadMemberAvatar } from "./actions";
import { useSession } from "next-auth/react";
import { FileUpload } from "@/components/ui/file-upload";
import { useTransition } from "react";

type Plan = {
  id: string;
  name: string;
  price: number;
  durationInDays: number;
};

export function MemberRowActions({ 
  memberId, 
  memberName, 
  plans 
}: { 
  memberId: string;
  memberName: string;
  plans: Plan[];
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isAvatarPending, startAvatarTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleAssign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    formData.append("memberId", memberId);
    
    try {
      await assignPlan(formData);
      setSuccess("Abonnement activé avec succès !");
      setTimeout(() => {
        setIsPlanModalOpen(false);
        setIsMenuOpen(false);
        setSuccess(null);
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Échec de l'attribution de l'abonnement");
    } finally {
      setIsPending(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement le membre "${memberName}" ?`)) {
      return;
    }

    setIsPending(true);
    try {
      await deleteMember(memberId);
      setIsMenuOpen(false);
    } catch (err: any) {
      alert(err.message || "Échec de la suppression");
    } finally {
      setIsPending(false);
    }
  }
  const handleAvatarUpload = (file: File | null) => {
    if (!file) return;
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("memberId", memberId);

    startAvatarTransition(async () => {
      try {
        const result = await uploadMemberAvatar(formData);
        if (result?.success) {
          setSuccess("Avatar mis à jour avec succès");
          setTimeout(() => {
            setIsAvatarModalOpen(false);
            setSuccess(null);
          }, 1500);
        }
      } catch (err: any) {
        setError(err.message || "Erreur lors du téléchargement");
      }
    });
  };

  const { data: session } = useSession();
  const canDelete = session?.user?.role === "GYM_OWNER" || session?.user?.role === "SUPER_ADMIN";

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button 
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {/* Dropdown Menu */}
      {isMenuOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsMenuOpen(false)} />
          <div className="absolute right-0 mt-1 w-52 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-40 overflow-hidden py-1">
            <button 
              onClick={() => {
                setIsPlanModalOpen(true);
                setIsMenuOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 text-xs text-zinc-200 hover:bg-emerald-500 hover:text-zinc-950 font-medium transition-colors flex items-center gap-2"
            >
              <Calendar className="w-3.5 h-3.5" />
              Renouveler Abonnement
            </button>
            <button 
              onClick={() => {
                setIsAvatarModalOpen(true);
                setIsMenuOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 text-xs text-zinc-200 hover:bg-zinc-800 transition-colors flex items-center gap-2"
            >
              <ImagePlus className="w-3.5 h-3.5 text-zinc-400" />
              Changer l'Avatar
            </button>
            <button 
              onClick={() => {
                setIsHistoryModalOpen(true);
                setIsMenuOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 text-xs text-zinc-200 hover:bg-zinc-800 transition-colors flex items-center gap-2"
            >
              <History className="w-3.5 h-3.5 text-zinc-400" />
              Historique des Passages
            </button>

            {canDelete && (
              <>
                <div className="border-t border-zinc-800 my-1" />
                <button 
                  onClick={handleDelete}
                  disabled={isPending}
                  className="w-full text-left px-4 py-2.5 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Supprimer le Membre
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* Plan Assignment Modal */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-white">Activer un Abonnement</h2>
              <button onClick={() => setIsPlanModalOpen(false)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-400 mb-5">
              Sélectionnez une formule pour <span className="text-emerald-400 font-semibold">{memberName}</span>.
            </p>
            
            {error && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {success}
              </div>
            )}

            <form onSubmit={handleAssign} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Formules Disponibles</label>
                <select 
                  required 
                  name="planId" 
                  className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="">-- Choisir une Formule --</option>
                  {plans.map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} ({plan.durationInDays} jours) - {plan.price.toLocaleString()} DZD
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2.5 mt-2 pt-4 border-t border-zinc-800">
                <button 
                  type="button" 
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-3.5 py-2 text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={isPending}
                  className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold px-4 py-2 rounded-xl transition-all text-xs shadow-lg shadow-emerald-500/20"
                >
                  {isPending ? "Activation..." : "Valider & Encaisser"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-white">Historique d'Accès</h2>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-400 mb-5">
              Journal des passages scanner de <span className="text-emerald-400 font-semibold">{memberName}</span>.
            </p>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-2.5 mb-5 max-h-60 overflow-y-auto">
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-zinc-800/60">
                <span className="text-zinc-300">Aujourd'hui à 14:32</span>
                <span className="text-emerald-400 font-semibold">QR Validé (Entrée)</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-zinc-800/60">
                <span className="text-zinc-400">Hier à 18:15</span>
                <span className="text-emerald-400 font-semibold">QR Validé (Entrée)</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1.5">
                <span className="text-zinc-500">Il y a 3 jours à 10:00</span>
                <span className="text-emerald-400 font-semibold">QR Validé (Entrée)</span>
              </div>
            </div>

            <button
              onClick={() => setIsHistoryModalOpen(false)}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-2.5 rounded-xl text-xs transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Avatar Upload Modal */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-white">Changer l'Avatar</h2>
              <button onClick={() => setIsAvatarModalOpen(false)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-400 mb-5">
              Téléchargez une nouvelle photo de profil pour <span className="text-emerald-400 font-semibold">{memberName}</span>.
            </p>
            
            {error && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {success}
              </div>
            )}

            <div className="bg-white rounded-xl p-4">
              <FileUpload 
                label="Photo (Max 2MB)"
                onFileSelect={handleAvatarUpload}
                isUploading={isAvatarPending}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
