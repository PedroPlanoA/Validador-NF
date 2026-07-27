"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Select } from "@/components/ui/Input";

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

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="p-5 border-b border-ink/8 bg-paper-alt/20 flex flex-wrap gap-3 items-center justify-between">
      <div className="flex items-center gap-3 flex-1 min-w-[280px]">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/30" />
          <input
            defaultValue={searchParams.get("q") ?? ""}
            onChange={(e) => updateParam("q", e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 text-xs border border-ink/10 rounded-input outline-none focus:ring-2 focus:ring-mint/40 bg-white"
          />
        </div>
        {filters.map((f) => (
          <Select
            key={f.key}
            value={searchParams.get(f.key) ?? "all"}
            onChange={(e) => updateParam(f.key, e.target.value)}
            className="w-auto py-2.5"
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
      <span className="text-xs text-ink/50">Mostrando {resultCount} registros</span>
    </div>
  );
}
