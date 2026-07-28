"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function ReanalyzeButton({ companyId, batchId }: { companyId: string; batchId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await fetch(`/api/c/${companyId}/imports/${batchId}/reanalyze`, { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:opacity-80 disabled:opacity-50"
      title="Reprocessar este lote com o mapeamento atual"
    >
      <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Reanalisar
    </button>
  );
}
