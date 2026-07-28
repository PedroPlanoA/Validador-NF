"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";
import { markValueDivergenceVerified, unmarkValueDivergenceVerified } from "@/lib/actions/valueCheck";

export function VerifyValueButton({
  companyId,
  codigoVenda,
  competencia,
  initialVerified,
}: {
  companyId: string;
  codigoVenda: string;
  competencia: string;
  initialVerified: boolean;
}) {
  const router = useRouter();
  const [verified, setVerified] = useState(initialVerified);
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      if (verified) {
        await unmarkValueDivergenceVerified(companyId, codigoVenda, competencia);
        setVerified(false);
      } else {
        await markValueDivergenceVerified(companyId, codigoVenda, competencia);
        setVerified(true);
      }
      router.refresh();
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-input px-2.5 py-1.5 transition-colors disabled:opacity-50 ${
        verified
          ? "bg-positive/10 text-positive"
          : "text-ink/45 hover:text-positive hover:bg-positive/10"
      }`}
      title={verified ? "Verificado — clique para desmarcar" : "Marcar como verificado (não remove o alerta)"}
    >
      {verified ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
      Verificado
    </button>
  );
}
