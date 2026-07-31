import Link from "next/link";
import { AlertTriangle, SlidersHorizontal } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { UnmappedStatus } from "@/lib/actions/unmappedStatuses";

/**
 * Aviso de valores de situação que os relatórios trazem e o mapeamento não
 * cobre. A comparação do status é exata, então uma letra em outra caixa ou um
 * espaço a mais já derruba o valor em "Outro" — e antes disso acontecia calado.
 *
 * O valor bruto aparece entre aspas e em fonte monoespaçada de propósito: é para
 * ser copiado e colado no mapeamento exatamente como está, inclusive espaços.
 */
export function UnmappedStatusAlert({
  companyId,
  unmapped,
}: {
  companyId: string;
  unmapped: UnmappedStatus[];
}) {
  if (unmapped.length === 0) return null;

  const total = unmapped.reduce((sum, u) => sum + u.quantidade, 0);

  return (
    <Card className="border-attention/30 bg-attention/5 p-5 space-y-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-attention shrink-0 mt-0.5" />
        <div className="min-w-0">
          <h3 className="text-base text-ink">
            {unmapped.length === 1
              ? "Um valor de situação não está mapeado"
              : `${unmapped.length} valores de situação não estão mapeados`}
          </h3>
          <p className="text-sm text-text-2 mt-1">
            {total === 1 ? "1 registro está" : `${total.toLocaleString("pt-BR")} registros estão`} classificado
            {total === 1 ? "" : "s"} como <strong>Outro</strong> porque o texto abaixo não corresponde a nenhuma
            chave do mapeamento. A comparação é exata — maiúsculas, acentos e espaços contam.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {unmapped.map((u) => (
          <div
            key={`${u.configId}-${u.valor}`}
            className="flex flex-wrap items-center justify-between gap-3 bg-white border border-ink/8 rounded-input px-3.5 py-2.5"
          >
            <div className="min-w-0 flex flex-wrap items-center gap-x-3 gap-y-1">
              <code className="font-mono text-[13px] font-semibold text-ink bg-attention/12 px-2 py-0.5 rounded">
                &quot;{u.valor}&quot;
              </code>
              <span className="text-xs text-ink/50">
                {u.configName} · {u.quantidade.toLocaleString("pt-BR")}{" "}
                {u.sourceType === "EMITTER" ? "nota(s)" : "venda(s)"}
              </span>
            </div>
            <Link
              href={`/c/${companyId}/config/${u.sourceType === "EMITTER" ? "emitters" : "platforms"}/${u.configId}/edit`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:opacity-80 shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" /> Mapear este valor
            </Link>
          </div>
        ))}
      </div>

      <p className="text-xs text-ink/50">
        Depois de mapear, use <strong>Reanalisar</strong> no lote correspondente — não é preciso reimportar o
        arquivo.
      </p>
    </Card>
  );
}
