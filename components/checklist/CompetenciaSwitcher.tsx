"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/Input";

export function CompetenciaSwitcher({
  companyId,
  competencia,
  competencias,
}: {
  companyId: string;
  competencia: string;
  competencias: string[];
}) {
  const router = useRouter();

  return (
    <Select
      value={competencia}
      onChange={(e) => router.push(`/c/${companyId}/checklist/${e.target.value}`)}
      className="w-auto py-2"
    >
      {!competencias.includes(competencia) && <option value={competencia}>{competencia}</option>}
      {competencias.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </Select>
  );
}
