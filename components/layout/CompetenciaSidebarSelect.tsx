"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { setCompetenciaCookie } from "@/lib/actions/competenciaCookie";
import { formatCompetencia } from "@/lib/format/competencia";

export function CompetenciaSidebarSelect({
  companyId,
  competencias,
  current,
}: {
  companyId: string;
  competencias: string[];
  current?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onChange(value: string) {
    startTransition(async () => {
      await setCompetenciaCookie(companyId, value);
      router.refresh();
    });
  }

  return (
    <div className="px-4 pb-4">
      <label className="flex items-center gap-1.5 text-[10px] font-bold text-sand/50 uppercase tracking-wider mb-1.5 px-0.5">
        <CalendarRange className="w-3 h-3" /> Competência
      </label>
      <div className="relative">
        <select
          value={current ?? "all"}
          onChange={(e) => onChange(e.target.value)}
          disabled={pending}
          className="w-full appearance-none bg-deep-dark border border-white/10 text-white text-sm font-semibold rounded-input pl-3 pr-8 py-2.5 outline-none focus:ring-2 focus:ring-mint/40 cursor-pointer disabled:opacity-60"
        >
          <option value="all">Todas</option>
          {competencias.map((c) => (
            <option key={c} value={c}>
              {formatCompetencia(c)}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sand/60"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}
