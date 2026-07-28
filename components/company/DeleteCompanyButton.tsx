"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteCompany } from "@/lib/actions/companies";

export function DeleteCompanyButton({
  companyId,
  companyName,
}: {
  companyId: string;
  companyName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!confirming) {
      setConfirming(true);
      return;
    }

    startTransition(async () => {
      await deleteCompany(companyId);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleClick}
      onBlur={() => setConfirming(false)}
      disabled={pending}
      title={confirming ? "Clique novamente para confirmar" : `Excluir ${companyName}`}
      className={`absolute top-4 right-4 flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-input transition-colors disabled:opacity-50 ${
        confirming
          ? "bg-danger text-white"
          : "text-ink/30 hover:text-danger hover:bg-danger/10"
      }`}
    >
      <Trash2 className="w-3.5 h-3.5" />
      {confirming && (pending ? "Excluindo..." : "Confirmar exclusão")}
    </button>
  );
}
