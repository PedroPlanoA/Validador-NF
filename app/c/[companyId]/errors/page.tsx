import { getReconciliationRows } from "@/lib/actions/reconciliation";
import { formatCurrency } from "@/lib/validation/currency";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ERROR_STATUSES, SITUACAO_CONFERENCIA_LABELS, SITUACAO_CONFERENCIA_TONE } from "@/lib/reconciliation/labels";

export const dynamic = "force-dynamic";

const ATTENTION_STATUSES = [...ERROR_STATUSES, "MULTIPLAS_NOTAS_REVISAO"] as const;

export default async function ErrorsPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ competencia?: string }>;
}) {
  const { companyId } = await params;
  const { competencia } = await searchParams;

  const rows = await getReconciliationRows(companyId, competencia);
  const errorRows = rows.filter((r) => (ATTENTION_STATUSES as readonly string[]).includes(r.situacaoConferencia));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-base font-bold text-ink">Painel de Erros</h1>
        <p className="text-xs text-ink/50 mt-1">{errorRows.length} venda(s) precisam de atenção.</p>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-paper-alt/40 border-b border-ink/8 text-ink/50 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-5">Código Venda</th>
                <th className="py-3 px-5">Comprador</th>
                <th className="py-3 px-5">Plataforma</th>
                <th className="py-3 px-5">Status Venda</th>
                <th className="py-3 px-5 text-right">Valor Venda</th>
                <th className="py-3 px-5">Situação da Reconciliação</th>
                <th className="py-3 px-5">Notas Vinculadas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5 font-medium text-ink">
              {errorRows.map((r) => (
                <tr key={r.saleId}>
                  <td className="py-3 px-5">{r.codigoVenda}</td>
                  <td className="py-3 px-5">{r.comprador}</td>
                  <td className="py-3 px-5">{r.plataforma}</td>
                  <td className="py-3 px-5">{r.situacaoVenda}</td>
                  <td className="py-3 px-5 text-right">{formatCurrency(r.valorVenda, r.moeda)}</td>
                  <td className="py-3 px-5">
                    <Badge tone={SITUACAO_CONFERENCIA_TONE[r.situacaoConferencia]}>
                      {SITUACAO_CONFERENCIA_LABELS[r.situacaoConferencia]}
                    </Badge>
                  </td>
                  <td className="py-3 px-5">
                    {r.matchedInvoices.length === 0
                      ? "—"
                      : r.matchedInvoices.map((i) => `${i.tipo} #${i.numero} (${i.situacaoNf})`).join(", ")}
                  </td>
                </tr>
              ))}
              {errorRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-ink/40 italic">
                    Nenhum erro reportado! Tudo reconciliado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
