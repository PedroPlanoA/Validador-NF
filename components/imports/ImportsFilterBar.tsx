"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Filter, X } from "lucide-react";
import { Select } from "@/components/ui/Input";
import { DateRangePicker } from "@/components/imports/DateRangePicker";
import { formatCompetencia } from "@/lib/format/competencia";

export function ImportsFilterBar({ fontes, competencias }: { fontes: string[]; competencias: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const activeCount = ["fonte", "competenciaRef", "dataInicio"].filter((k) => searchParams.get(k)).length;

  function update(key: string, value: string | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  function updateRange(dataInicio?: string, dataFim?: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (dataInicio) params.set("dataInicio", dataInicio);
    else params.delete("dataInicio");
    if (dataFim) params.set("dataFim", dataFim);
    else params.delete("dataFim");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm font-semibold text-ink/70 border border-ink/10 rounded-input px-4 py-2.5 bg-white hover:border-mint transition-colors"
      >
        <Filter className="w-4 h-4" /> Filtros
        {activeCount > 0 && (
          <span className="bg-mint text-deep text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="flex flex-wrap items-center gap-3 mt-3 bg-white border border-ink/10 rounded-card-sm p-4">
          <Select
            value={searchParams.get("fonte") ?? "all"}
            onChange={(e) => update("fonte", e.target.value === "all" ? undefined : e.target.value)}
            className="w-auto py-2.5"
          >
            <option value="all">Todas as Fontes</option>
            {fontes.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </Select>
          <Select
            value={searchParams.get("competenciaRef") ?? "all"}
            onChange={(e) => update("competenciaRef", e.target.value === "all" ? undefined : e.target.value)}
            className="w-auto py-2.5"
          >
            <option value="all">Todas as Competências</option>
            {competencias.map((c) => (
              <option key={c} value={c}>
                {formatCompetencia(c)}
              </option>
            ))}
          </Select>
          <DateRangePicker
            dataInicio={searchParams.get("dataInicio") ?? undefined}
            dataFim={searchParams.get("dataFim") ?? undefined}
            onChange={updateRange}
          />
          {activeCount > 0 && (
            <button
              onClick={() => router.push(pathname)}
              className="flex items-center gap-1 text-xs font-semibold text-ink/40 hover:text-ink"
            >
              <X className="w-3.5 h-3.5" /> Limpar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}
