import Link from "next/link";
import { getReconciliationRows } from "@/lib/actions/reconciliation";
import { getCompetenciaCookie } from "@/lib/actions/competenciaCookie";
import { getVerifiedKeys } from "@/lib/actions/valueCheck";
import { formatCurrency } from "@/lib/validation/currency";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageTitle } from "@/components/ui/PageTitle";
import { VerifyValueButton } from "@/components/errors/VerifyValueButton";
import { SlidersHorizontal } from "lucide-react";
import { ERROR_STATUSES, SITUACAO_CONFERENCIA_LABELS, SITUACAO_CONFERENCIA_TONE } from "@/lib/reconciliation/labels";

export const dynamic = "force-dynamic";

const ATTENTION_STATUSES = [...ERROR_STATUSES, "MULTIPLAS_NOTAS_REVISAO"] as const;

export default async function ErrorsPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const competencia = await getCompetenciaCookie(companyId);

  const [rows, verifiedKeys] = await Promise.all([
    getReconciliationRows(companyId, competencia),
    getVerifiedKeys(companyId),
  ]);

  const errorRows = rows.filter(
    (r) => (ATTENTION_STATUSES as readonly string[]).includes(r.situacaoConferencia) || r.valorDivergente,
  );

  return (
    <div className="space-y-6">
      <div>
        <PageTitle>Painel de Erros</PageTitle>
        <p className="text-xs text-ink/50 mt-1">{errorRows.length} venda(s) precisam de atenção.</p>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-paper-alt/40 border-b border-ink/8 text-ink/50 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-5">Código Venda</th>
                <th className="py-3 px-5">Comprador</th>
                <th className="py-3 px-5">Plataforma / Produto</th>
                <th className="py-3 px-5">Situação da Reconciliação</th>
                <th className="py-3 px-5 text-right">Valor Calc. NF</th>
                <th className="py-3 px-5 text-right">Valor Faturado</th>
                <th className="py-3 px-5">Notas Vinculadas</th>
                <th className="py-3 px-5">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5 font-medium text-ink">
              {errorRows.map((r) => {
                const isVerified = verifiedKeys.has(`${r.codigoVenda}|${r.competenciaEfetiva}`);
                return (
                  <tr key={r.saleId}>
                    <td className="py-3 px-5">{r.codigoVenda}</td>
                    <td className="py-3 px-5">{r.comprador}</td>
                    <td className="py-3 px-5">
                      <div>{r.plataforma}</div>
                      <div className="text-ink/40 font-normal">{r.produto}</div>
                    </td>
                    <td className="py-3 px-5">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge tone={SITUACAO_CONFERENCIA_TONE[r.situacaoConferencia]}>
                          {SITUACAO_CONFERENCIA_LABELS[r.situacaoConferencia]}
                        </Badge>
                        {r.valorDivergente && (
                          <Badge tone={isVerified ? "neutral" : "attention"}>
                            {isVerified ? "Divergência (verificada)" : "Divergência de Valor"}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-5 text-right">{formatCurrency(r.valorNfCalculado, r.moeda)}</td>
                    <td className="py-3 px-5 text-right">
                      {r.valorNfFaturado === null ? "—" : formatCurrency(r.valorNfFaturado, r.moeda)}
                    </td>
                    <td className="py-3 px-5">
                      {r.matchedInvoices.length === 0
                        ? "—"
                        : r.matchedInvoices.map((i) => `${i.tipo} #${i.numero} (${i.situacaoNf})`).join(", ")}
                    </td>
                    <td className="py-3 px-5">
                      {r.valorDivergente && (
                        <div className="flex flex-col items-start gap-1.5">
                          <VerifyValueButton
                            companyId={companyId}
                            codigoVenda={r.codigoVenda}
                            competencia={r.competenciaEfetiva}
                            initialVerified={isVerified}
                          />
                          <Link
                            href={`/c/${companyId}/products?plataforma=${encodeURIComponent(r.plataforma)}&produto=${encodeURIComponent(r.produto)}`}
                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:opacity-80"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" /> Ajustar % Comissão
                          </Link>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {errorRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-ink/40 italic">
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
