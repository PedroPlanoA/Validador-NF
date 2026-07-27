"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select } from "@/components/ui/Input";

export function CompetenciaFilter({ competencias }: { competencias: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("competencia") ?? "all";

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("competencia");
    else params.set("competencia", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2 bg-white rounded-input p-1 border border-ink/10">
      <span className="text-xs font-semibold text-ink/50 px-2">Competência:</span>
      <Select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className="border-0 py-1.5 px-3 w-auto"
      >
        <option value="all">Ver Tudo</option>
        {competencias.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>
    </div>
  );
}
