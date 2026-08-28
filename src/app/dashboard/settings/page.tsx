import { getTenantGym } from "@/lib/tenant";
import prisma from "@/lib/prisma";
import { Building2, Phone, MapPin, CreditCard, Shield, Save, Plus, KeyRound, Lock } from "lucide-react";
import { revalidatePath } from "next/cache";
import { requireAuthUser } from "@/lib/rbac";
import { updateGymInfoSchema, createPlanSchema, changePasswordSchema } from "@/lib/validations";
import { verifyPassword, hashPassword } from "@/lib/password";
import { handleServerActionError, ValidationError } from "@/lib/errors";
import { GymLogoForm } from "./gym-logo-form";

export default async function SettingsPage() {
  // Enforce role authorization at page load: Strictly Owners and Super Admins
  const authUser = await requireAuthUser(["GYM_OWNER", "SUPER_ADMIN"]);
  
  const tenant = await getTenantGym();
  const gym = tenant?.gym;

  const plans = gym ? await prisma.plan.findMany({
    where: { gymId: authUser.gymId },
    orderBy: { price: "asc" }
  }) : [];

  async function updateGymInfo(formData: FormData) {
    "use server";
    try {
      // 1. Enforce role authorization on mutation
      const user = await requireAuthUser(["GYM_OWNER", "SUPER_ADMIN"]);

      // 2. Validate with Zod Schema
      const rawData = {
        name: formData.get("name"),
        phone: formData.get("phone") || undefined,
        address: formData.get("address") || undefined,
      };

      const validationResult = updateGymInfoSchema.safeParse(rawData);
      if (!validationResult.success) {
        const errorMessage = validationResult.error.issues.map(e => e.message).join(". ");
        throw new ValidationError(errorMessage);
      }

      const { name, phone, address } = validationResult.data;
      
      if (user.gymId) {
        await prisma.gym.update({
          where: { id: user.gymId },
          data: { name, phone: phone || null, address: address || null }
        });
        revalidatePath("/dashboard");
        revalidatePath("/dashboard/settings");
      }
    } catch (error) {
      handleServerActionError(error, "Échec de la mise à jour des paramètres de la salle");
    }
  }

  async function createPlan(formData: FormData) {
    "use server";
    try {
      // 1. Enforce role authorization on mutation
      const user = await requireAuthUser(["GYM_OWNER", "SUPER_ADMIN"]);

      // 2. Validate with Zod Schema
      const rawData = {
        name: formData.get("name"),
        durationInDays: Number(formData.get("duration")),
        price: Number(formData.get("price")),
      };

      const validationResult = createPlanSchema.safeParse(rawData);
      if (!validationResult.success) {
        const errorMessage = validationResult.error.issues.map(e => e.message).join(". ");
        throw new ValidationError(errorMessage);
      }

      const { name, durationInDays, price } = validationResult.data;

      if (user.gymId) {
        await prisma.plan.create({
          data: {
            gymId: user.gymId,
            name,
            durationInDays,
            price,
            isActive: true
          }
        });
        revalidatePath("/dashboard/settings");
        revalidatePath("/dashboard/members");
      }
    } catch (error) {
      handleServerActionError(error, "Échec de la création de la formule");
    }
  }

  async function changePassword(formData: FormData) {
    "use server";
    try {
      // 1. Authenticate user
      const user = await requireAuthUser(["GYM_OWNER", "SUPER_ADMIN", "STAFF"]);

      const rawData = {
        currentPassword: formData.get("currentPassword"),
        newPassword: formData.get("newPassword"),
        confirmPassword: formData.get("confirmPassword"),
      };

      // 2. Validate with Zod Complexity Schema
      const validationResult = changePasswordSchema.safeParse(rawData);
      if (!validationResult.success) {
        const errorMessage = validationResult.error.issues.map(e => e.message).join(". ");
        throw new ValidationError(errorMessage);
      }

      const { currentPassword, newPassword } = validationResult.data;

      // 3. Fetch user's current password hash from DB
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id }
      });

      if (!dbUser) {
        throw new ValidationError("Utilisateur introuvable");
      }

      // 4. Verify current password
      const isCurrentValid = await verifyPassword(currentPassword, dbUser.passwordHash);
      if (!isCurrentValid) {
        throw new ValidationError("Le mot de passe actuel est incorrect");
      }

      // 5. Hash new password with OWASP salt factor 12
      const upgradedHash = await hashPassword(newPassword);

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: upgradedHash }
      });

      revalidatePath("/dashboard/settings");
    } catch (error) {
      handleServerActionError(error, "Échec du changement de mot de passe");
    }
  }

  return (
    <div className="flex flex-col gap-8 p-8 w-full min-h-screen bg-[#09090b]">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            Espace Administrateur / Gérant
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-50">Paramètres de l'Établissement</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Configurez l'identité de votre salle de sport, vos coordonnées, la sécurité et la grille tarifaire.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: General Info & Tarifs & Password */}
        <div className="lg:col-span-2 space-y-6">
          <GymLogoForm currentLogoUrl={gym?.logoUrl} />

          {/* Gym Details Card */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-800">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Coordonnées de la Salle</h2>
                <p className="text-xs text-zinc-400">Ces informations figurent sur les reçus et l'application mobile.</p>
              </div>
            </div>

            <form action={updateGymInfo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Nom de l'Établissement
                </label>
                <input
                  name="name"
                  type="text"
                  defaultValue={gym?.name || "Atlas Fitness Club"}
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Téléphone Contact
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      name="phone"
                      type="text"
                      defaultValue={gym?.phone || "0550 12 34 56"}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Adresse & Wilaya
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      name="address"
                      type="text"
                      defaultValue={gym?.address || "14 Boulevard Didouche Mourad, Alger"}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20"
                >
                  <Save className="w-4 h-4" /> Enregistrer les Modifications
                </button>
              </div>
            </form>
          </div>

          {/* Password & Account Security Card */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-800">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Sécurité du Compte & Mot de Passe</h2>
                <p className="text-xs text-zinc-400">Modifiez votre mot de passe pour sécuriser votre espace gérant.</p>
              </div>
            </div>

            <form action={changePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Mot de passe actuel
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    name="currentPassword"
                    type="password"
                    required
                    placeholder="••••••••••••"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Nouveau mot de passe
                  </label>
                  <input
                    name="newPassword"
                    type="password"
                    required
                    placeholder="Min. 8 caractères (Maj + Chiffre)"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Confirmer le nouveau mot de passe
                  </label>
                  <input
                    name="confirmPassword"
                    type="password"
                    required
                    placeholder="Répétez le mot de passe"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20"
                >
                  <Lock className="w-4 h-4" /> Mettre à jour le Mot de Passe
                </button>
              </div>
            </form>
          </div>

          {/* Subscription Plans Card */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Grille des Abonnements</h2>
                  <p className="text-xs text-zinc-400">Formules tarifaires proposées aux adhérents.</p>
                </div>
              </div>
            </div>

            {/* List of existing plans */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {plans.map((p) => (
                <div
                  key={p.id}
                  className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-sm text-white">{p.name}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {p.durationInDays} jours
                      </span>
                    </div>
                  </div>
                  <p className="text-xl font-black text-emerald-400 mt-4">
                    {p.price.toLocaleString()} <span className="text-xs font-normal text-zinc-400">DZD</span>
                  </p>
                </div>
              ))}
            </div>

            {/* Add new plan form */}
            <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-emerald-400" /> Ajouter une Nouvelle Formule
              </h4>

              <form action={createPlan} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  name="name"
                  placeholder="Nom (ex: Pass Étudiant)"
                  required
                  className="sm:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                />
                <input
                  name="duration"
                  type="number"
                  placeholder="Durée (jours)"
                  required
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                />
                <input
                  name="price"
                  type="number"
                  placeholder="Prix DZD"
                  required
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="sm:col-span-4 bg-zinc-800 hover:bg-emerald-500 hover:text-zinc-950 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 mt-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Créer la Formule
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Right Col: Multi-Tenancy & Security Details */}
        <div className="space-y-6">
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-zinc-800">
              <Shield className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Sécurité & Multi-Tenant</h3>
            </div>

            <div className="space-y-3 text-xs text-zinc-400">
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <p className="font-semibold text-zinc-300 mb-1">Identifiant Tenant Unique :</p>
                <p className="font-mono text-[11px] text-emerald-400 break-all">{authUser.gymId}</p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <p className="font-semibold text-zinc-300 mb-1">Rôle Actuel :</p>
                <p className="text-emerald-400 font-bold">{authUser.role}</p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <p className="font-semibold text-zinc-300 mb-1">Hachage Mot de Passe :</p>
                <p className="text-amber-400 font-semibold">Bcrypt (Facteur de Coût 12 OWASP)</p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <p className="font-semibold text-zinc-300 mb-1">Base de Données Cloud :</p>
                <p className="text-zinc-400">Neon Serverless PostgreSQL (eu-central-1)</p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <p className="font-semibold text-zinc-300 mb-1">Validation & Schémas :</p>
                <p className="text-emerald-400 font-medium">Zod Typesafe Schema Parsing</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
