"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MemberRowActions } from "./member-row-actions";
import { Phone, Mail, User } from "lucide-react";

export type Member = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "ACTIVE" | "EXPIRED";
  planName?: string;
  avatarUrl?: string | null;
};

export const getColumns = (plans: any[]): ColumnDef<Member>[] => [
  {
    accessorKey: "name",
    header: "Adhérent",
    cell: ({ row }) => {
      const avatarUrl = row.original.avatarUrl;
      return (
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={row.getValue("name")} className="w-8 h-8 rounded-full object-cover border border-zinc-700" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-emerald-400">
              {row.getValue<string>("name")?.charAt(0) || "M"}
            </div>
          )}
          <div>
            <div className="font-semibold text-zinc-100 text-sm">{row.getValue("name")}</div>
          <div className="text-zinc-500 text-xs flex items-center gap-1 mt-0.5">
            <User className="w-3 h-3 text-zinc-600" /> Membre Actif
          </div>
        </div>
      </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <div className="text-zinc-300 text-xs flex items-center gap-1.5 font-mono">
        <Mail className="w-3.5 h-3.5 text-zinc-500" />
        {row.getValue("email")}
      </div>
    ),
  },
  {
    accessorKey: "phone",
    header: "Téléphone",
    cell: ({ row }) => (
      <div className="text-zinc-300 text-xs flex items-center gap-1.5 font-mono">
        <Phone className="w-3.5 h-3.5 text-zinc-500" />
        {row.getValue("phone") || "Non renseigné"}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Statut Abonnement",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const isActive = status === "ACTIVE";

      return (
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
            isActive
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
              isActive ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
            }`}
          />
          {isActive ? "Actif & Valide" : "Expiré / Inactif"}
        </span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const member = row.original;
      return <MemberRowActions memberId={member.id} memberName={member.name} plans={plans} />;
    },
  },
];
