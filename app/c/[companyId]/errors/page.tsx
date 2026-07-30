import Link from "next/link";
import { getReconciliationRows } from "@/lib/actions/reconciliation";
import { getVerifiedKeys } from "@/lib/actions/valueCheck";
import { formatCurrency } from "@/lib/validation/currency";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageTitle";
import { FilterBar } from "@/components/ui/FilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { HoverTooltip } from "@/components/ui/HoverTooltip";
import { TABLE_CLASS, THEAD_CLASS, TBODY_CLASS, TR_CLASS } from "@/components/ui/Table";
import { VerifyValueButton } from "@/components/errors/VerifyValueButton";
import { SlidersHorizontal, ShieldCheck } from "lucide-react";
import { combineStatus } from "@/lib/reconciliation/classify";
import {
  ERROR_STATUSES,
  SITUACAO_CONFERENCIA_LABELS,
  SITUACAO_CONFERENCIA_TONE,
  SITUACAO_NF_LABELS,
  SITUACAO_VENDA_LABELS,
} from "@/lib/reconciliation/labels";
import type { SituacaoNf } from "@/lib/mapping/types";

export const dynamic = "force-dynamic";

const ATTENTION_STATUSES = [...ERROR_STATUSES, "MULTIPLAS_NOTAS_REVISAO"] as const;

function notasVinculadasTexto(notas: { tipo: string; numero: string; situacaoNf: string }[]): string {
  return notas.map((i) => `${i.tipo} #${i.numero} (${SITUACAO_NF_LABELS[i.situacaoNf as SituacaoNf]})`).join(", ");
}

export default async function ErrorsPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{
    q?: string;
    plataforma?: string;
    situacaoNf?: string;
    situacaoVenda?: string;
    situacaoConferencia?: string;
  }>;
}) {
  const { companyId } = await params;
  const sp = await searchParams;

  // Deliberadamente NÃO filtrado pela competência global — o Painel de
  // Erros deve sempre mostrar todas as divergências encontradas, para não
  // esconder um erro só porque ele caiu fora do mês selecionado alhures.
  const [allRows, verifiedKeys] = await Promise.all([
    getReconciliationRows(companyId),
    getVerifiedKeys(companyId),
  ]);

  const allErrorRows = allRows.filter(
    (r) => (ATTENTION_STATUSES as readonly string[]).includes(r.situacaoConferencia) || r.valorDivergente,
  );

  const situacaoNfOf = (r: (typeof allErrorRows)[number]) =>
    r.matchedInvoices.length > 0 ? SITUACAO_NF_LABELS[combineStatus(r.matchedInvoices.map((i) => i.situacaoNf))] : null;

  const platformOptions = Array.from(new Set(allErrorRows.map((r) => r.plataforma))).sort();
  const situacaoNfOptions = Array.from(new Set(allErrorRows.map(situacaoNfOf).filter((v): v is string => !!v))).sort();
  const situacaoVendaOptions = Array.from(new Set(allErrorRows.map((r) => SITUACAO_VENDA_LABELS[r.situacaoVenda]))).sort();
  const situacaoConferenciaOptions = Array.from(
    new Set(allErrorRows.map((r) => SITUACAO_CONFERENCIA_LABELS[r.situacaoConferencia])),
  ).sort();

  let errorRows = allErrorRows;
  if (sp.plataforma) errorRows = errorRows.filter((r) => r.plataforma === sp.plataforma);
  if (sp.situacaoNf) errorRows = errorRows.filter((r) => situacaoNfOf(r) === sp.situacaoNf);
  if (sp.situacaoVenda) errorRows = errorRows.filter((r) => SITUACAO_VENDA_LABELS[r.situacaoVenda] === sp.situacaoVenda);
  if (sp.situacaoConferencia) {
    errorRows = errorRows.filter((r) => SITUACAO_CONFERENCIA_LABELS[r.situacaoConferencia] === sp.situacaoConferencia);
  }
  if (sp.q) {
    const q = sp.q.toLowerCase();
    errorRows = errorRows.filter(
      (r) => r.codigoVenda.toLowerCase().includes(q) || r.comprador.toLowerCase().includes(q),
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel de Erros"
        sub={
          allErrorRows.length === 0
            ? "Nenhuma divergência pendente."
            : `${allErrorRows.length} venda(s) precisam de atenção — todas as competências.`
        }
      />

      <FilterBar
        searchPlaceholder="Pesquisar por código, comprador..."
        filters={[
          { key: "plataforma", label: "Todas as Plataformas", options: platformOptions },
          { key: "situacaoNf", label: "Todas as Situações NF", options: situacaoNfOptions },
          { key: "situacaoVenda", label: "Todas as Situações da Venda", options: situacaoVendaOptions },
          { key: "situacaoConferencia", label: "Todas as Situações da Reconciliação", options: situacaoConferenciaOptions },
        ]}
        resultCount={errorRows.length}
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className={TABLE_CLASS}>
            <thead className={THEAD_CLASS}>
              <tr>
                <th className="py-3 px-2 whitespace-nowrap">Código Venda</th>
                <th className="py-3 px-2">Comprador</th>
                <th className="py-3 px-2">Plataforma / Produto</th>
                <th className="py-3 px-2">Situação Original</th>
                <th className="py-3 px-2">Reconciliação</th>
                <th className="py-3 px-2 text-right whitespace-nowrap">Valor Calc.</th>
                <th className="py-3 px-2 text-right whitespace-nowrap">Valor Fat.</th>
                <th className="py-3 px-2">Notas Vinculadas</th>
                <th className="py-3 px-2 whitespace-nowrap">Ação</th>
              </tr>
            </thead>
            <tbody className={TBODY_CLASS}>
              {errorRows.map((r) => {
                const isVerified = verifiedKeys.has(`${r.codigoVenda}|${r.competenciaEfetiva}`);
                return (
                  <tr key={r.saleId} className={TR_CLASS}>
                    <td className="py-2.5 px-2 whitespace-nowrap">{r.codigoVenda}</td>
                    <td className="py-2.5 px-2 max-w-[110px] truncate" title={r.comprador}>
                      {r.comprador}
                    </td>
                    <td className="py-2.5 px-2 max-w-[120px]">
                      <div className="truncate">{r.plataforma}</div>
                      <div className="text-ink/40 font-normal truncate" title={r.produto}>
                        {r.produto}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 max-w-[120px] truncate" title={r.situacaoVendaOriginal}>
                      {r.situacaoVendaOriginal || "—"}
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge tone={SITUACAO_CONFERENCIA_TONE[r.situacaoConferencia]}>
                          {SITUACAO_CONFERENCIA_LABELS[r.situacaoConferencia]}
                        </Badge>
                        {r.valorDivergente && (
                          <Badge tone={isVerified ? "neutral" : "attention"}>
                            {isVerified ? "Verificada" : "Divergência"}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-right whitespace-nowrap">
                      {formatCurrency(r.valorNfCalculado, r.moeda)}
                    </td>
                    <td className="py-2.5 px-2 text-right whitespace-nowrap">
                      {r.valorNfFaturado === null ? "—" : formatCurrency(r.valorNfFaturado, r.moeda)}
                    </td>
                    <td className="py-2.5 px-2 max-w-[110px]">
                      {r.matchedInvoices.length === 0 ? (
                        "—"
                      ) : (
                        <HoverTooltip text={notasVinculadasTexto(r.matchedInvoices)} className="block cursor-help">
                          <span className="block truncate underline decoration-dotted decoration-ink/25 underline-offset-4">
                            {notasVinculadasTexto(r.matchedInvoices)}
                          </span>
                        </HoverTooltip>
                      )}
                    </td>
                    <td className="py-2.5 px-2">
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
                            title="Ajustar % Comissão"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {errorRows.length === 0 && (
                <tr>
                  <td colSpan={9}>
                    <EmptyState
                      icon={ShieldCheck}
                      title={allErrorRows.length === 0 ? "Tudo reconciliado" : "Nenhum erro com estes filtros"}
                      description={
                        allErrorRows.length === 0
                          ? "Nenhuma divergência entre vendas e notas fiscais nas competências importadas."
                          : "Existem divergências, mas nenhuma corresponde aos filtros aplicados acima."
                      }
                    />
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
