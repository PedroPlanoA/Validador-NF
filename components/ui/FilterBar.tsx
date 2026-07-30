"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, Filter, X } from "lucide-react";
import { Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export interface FilterSpec {
  key: string;
  label: string;
  options: string[];
}

export function FilterBar({
  searchPlaceholder,
  filters,
  resultCount,
}: {
  searchPlaceholder: string;
  filters: FilterSpec[];
  resultCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const activeFilters = filters
    .map((f) => ({ ...f, value: searchParams.get(f.key) }))
    .filter((f): f is FilterSpec & { value: string } => !!f.value);
  const activeCount = activeFilters.length;

  function openModal() {
    setDraft(Object.fromEntries(filters.map((f) => [f.key, searchParams.get(f.key) ?? "all"])));
    setOpen(true);
  }

  // Cada tecla digitada dispara uma navegação server-side (as telas são
  // `force-dynamic`), então a busca espera a pessoa parar de digitar em vez de
  // refazer a consulta letra por letra.
  function updateSearch(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value) params.delete("q");
      else params.set("q", value);
      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    }, 350);
  }

  function removeFilter(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  function applyFilters() {
    const params = new URLSearchParams(searchParams.toString());
    for (const f of filters) {
      const value = draft[f.key];
      if (!value || value === "all") params.delete(f.key);
      else params.set(f.key, value);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  }

  function clearFilters() {
    const params = new URLSearchParams(searchParams.toString());
    for (const f of filters) params.delete(f.key);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  }

  return (
    <div className="p-5 border-b border-ink/8 bg-paper-alt/20 space-y-3">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-ink/30 pointer-events-none" />
          <input
            defaultValue={searchParams.get("q") ?? ""}
            onChange={(e) => updateSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-11 pr-4 py-3 text-sm text-ink placeholder:text-ink/40 border border-ink/10 rounded-input outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint bg-white transition-shadow"
          />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-ink/50 tabular-nums">
            {resultCount === 1 ? "1 registro" : `${resultCount.toLocaleString("pt-BR")} registros`}
          </span>
          {filters.length > 0 && (
            <button
              onClick={openModal}
              className="flex items-center gap-2 text-sm font-semibold text-ink/70 border border-ink/10 rounded-input px-4 py-2.5 bg-white hover:border-mint transition-colors outline-none focus-visible:ring-4 focus-visible:ring-mint/30"
            >
              <Filter className="w-4 h-4" /> Filtros
              {activeCount > 0 && (
                <span className="bg-mint text-deep text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Filtros aplicados ficam visíveis como pastilhas — sem isso a pessoa
          precisa abrir o modal só para descobrir por que a lista está curta. */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => removeFilter(f.key)}
              title="Remover este filtro"
              className="group flex items-center gap-1.5 text-xs font-semibold text-deep bg-mint/12 border border-mint/30 rounded-pill pl-3 pr-2 py-1.5 hover:bg-mint/20 transition-colors"
            >
              {f.value}
              <X className="w-3 h-3 text-deep/50 group-hover:text-deep" />
            </button>
          ))}
        </div>
      )}

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
              {filters.map((f) => (
                <Select
                  key={f.key}
                  value={draft[f.key] ?? "all"}
                  onChange={(e) => setDraft((prev) => ({ ...prev, [f.key]: e.target.value }))}
                >
                  <option value="all">{f.label}</option>
                  {f.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </Select>
              ))}
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
