"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * Mapeamentos são globais, mas o analista quase sempre chega aqui de dentro
 * de uma empresa específica — voltar para a lista de empresas força um
 * clique a mais para reabrir a mesma empresa. Quando a navegação carrega
 * ?companyId=, volta direto para o dashboard daquela empresa.
 */
export function ConfigBackLink() {
  const companyId = useSearchParams().get("companyId");
  const href = companyId ? `/c/${companyId}/dashboard` : "/companies";
  const label = companyId ? "Voltar à empresa" : "Empresas";

  return (
    <Link href={href} className="flex items-center gap-1.5 text-xs font-semibold text-ink/50 hover:text-mint transition-colors">
      <ArrowLeft className="w-3.5 h-3.5" /> {label}
    </Link>
  );
}
