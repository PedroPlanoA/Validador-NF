"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Filter, X } from "lucide-react";
import { Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DateRangePicker } from "@/components/imports/DateRangePicker";
import { formatCompetencia } from "@/lib/format/competencia";

const FILTER_KEYS = ["fonte", "competenciaRef", "dataInicio"];

export function ImportsFilterBar({ fontes, competencias }: { fontes: string[]; competencias: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ fonte: string; competenciaRef: string; dataInicio?: string; dataFim?: string }>(
    { fonte: "all", competenciaRef: "all" },
  );

  const activeCount = FILTER_KEYS.filter((k) => searchParams.get(k)).length;

  function openModal() {
    setDraft({
      fonte: searchParams.get("fonte") ?? "all",
      competenciaRef: searchParams.get("competenciaRef") ?? "all",
      dataInicio: searchParams.get("dataInicio") ?? undefined,
      dataFim: searchParams.get("dataFim") ?? undefined,
    });
    setOpen(true);
  }

  function applyFilters() {
    const params = new URLSearchParams(searchParams.toString());
    if (draft.fonte === "all") params.delete("fonte");
    else params.set("fonte", draft.fonte);
    if (draft.competenciaRef === "all") params.delete("competenciaRef");
    else params.set("competenciaRef", draft.competenciaRef);
    if (draft.dataInicio) params.set("dataInicio", draft.dataInicio);
    else params.delete("dataInicio");
    if (draft.dataFim) params.set("dataFim", draft.dataFim);
    else params.delete("dataFim");
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  }

  function clearFilters() {
    router.push(pathname);
    setOpen(false);
  }

  return (
    <div>
      <button
        onClick={openModal}
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
        <div
          className="fixed inset-0 z-40 bg-ink/40 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-card-sm shadow-card-hover w-full max-w-md p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-black text-lg text-deep">Filtros</h3>
              <button onClick={() => setOpen(false)} className="text-ink/40 hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <Select
                value={draft.fonte}
                onChange={(e) => setDraft((prev) => ({ ...prev, fonte: e.target.value }))}
              >
                <option value="all">Todas as Fontes</option>
                {fontes.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </Select>
              <Select
                value={draft.competenciaRef}
                onChange={(e) => setDraft((prev) => ({ ...prev, competenciaRef: e.target.value }))}
              >
                <option value="all">Todas as Competências</option>
                {competencias.map((c) => (
                  <option key={c} value={c}>
                    {formatCompetencia(c)}
                  </option>
                ))}
              </Select>
              <DateRangePicker
                dataInicio={draft.dataInicio}
                dataFim={draft.dataFim}
                onChange={(dataInicio, dataFim) => setDraft((prev) => ({ ...prev, dataInicio, dataFim }))}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              {activeCount > 0 ? (
                <button
                  onClick={clearFilters}
                  className="text-sm font-semibold text-ink/50 hover:text-danger transition-colors"
                >
                  Remover filtro
                </button>
              ) : (
                <span />
              )}
              <Button onClick={applyFilters}>Filtrar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
