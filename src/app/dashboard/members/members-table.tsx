"use client";

import { useMemo } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { MemberRowActions } from "./member-row-actions";
import { Phone, Mail, User } from "lucide-react";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export type Member = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "ACTIVE" | "EXPIRED";
  planName?: string;
};

interface MembersTableProps {
  data: Member[];
  plans: any[];
  page?: number;
  totalPages?: number;
}

export function MembersTable({ data, plans, page = 1, totalPages = 1 }: MembersTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };
  const columns = useMemo<ColumnDef<Member>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Adhérent",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-emerald-400">
              {row.getValue<string>("name")?.charAt(0) || "M"}
            </div>
            <div>
              <div className="font-semibold text-zinc-100 text-sm">{row.getValue("name")}</div>
              <div className="text-zinc-500 text-xs flex items-center gap-1 mt-0.5">
                <User className="w-3 h-3 text-zinc-600" /> Membre Actif
              </div>
            </div>
          </div>
        ),
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
    ],
    [plans]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wider">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="h-12 px-6 align-middle font-bold">
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-zinc-800/40">
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-zinc-800/20 transition-colors"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-6 py-4 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="h-32 text-center text-zinc-500 text-sm">
                Aucun adhérent enregistré dans la base de données.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-900/40">
          <div className="text-xs text-zinc-500">
            Page {page} sur {totalPages}
          </div>
          <div className="flex gap-2">
            <button 
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
              className="px-3 py-1.5 text-xs font-medium bg-zinc-800 text-zinc-300 rounded-md disabled:opacity-50 hover:bg-zinc-700 transition-colors"
            >
              Précédent
            </button>
            <button 
              disabled={page >= totalPages}
              onClick={() => handlePageChange(page + 1)}
              className="px-3 py-1.5 text-xs font-medium bg-zinc-800 text-zinc-300 rounded-md disabled:opacity-50 hover:bg-zinc-700 transition-colors"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
