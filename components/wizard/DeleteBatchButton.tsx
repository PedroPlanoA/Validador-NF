"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteBatchButton({
  companyId,
  batchId,
  filename,
}: {
  companyId: string;
  batchId: string;
  filename: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    const confirmed = window.confirm(
      `Excluir "${filename}"? Todas as vendas/notas geradas por este arquivo serão removidas. Esta ação não pode ser desfeita.`,
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      await fetch(`/api/c/${companyId}/imports/${batchId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-danger hover:opacity-80 disabled:opacity-50"
      title="Excluir este arquivo importado"
    >
      <Trash2 className="w-3.5 h-3.5" /> Excluir
    </button>
  );
}
