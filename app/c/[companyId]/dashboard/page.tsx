import Link from "next/link";
import { getReconciliationRows } from "@/lib/actions/reconciliation";
import { getCompetenciaCookie } from "@/lib/actions/competenciaCookie";
import { formatCurrency } from "@/lib/validation/currency";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SituacaoChart } from "@/components/dashboard/SituacaoChart";
import { PlatformChart } from "@/components/dashboard/PlatformChart";
import { Card } from "@/components/ui/Card";
import { PageTitle } from "@/components/ui/PageTitle";
import { FileSpreadsheet } from "lucide-react";
import { SITUACAO_CONFERENCIA_LABELS } from "@/lib/reconciliation/labels";
import type { ReconciliationRow } from "@/lib/reconciliation/types";

export const dynamic = "force-dynamic";

function sum(rows: ReconciliationRow[], pick: (r: ReconciliationRow) => number) {
  return rows.reduce((acc, r) => acc + pick(r), 0);
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const competencia = await getCompetenciaCookie(companyId);

  const rows = await getReconciliationRows(companyId, competencia);

  const concluidas = rows.filter((r) => r.situacaoVenda === "CONCLUIDO");
  const emitidas = rows.filter((r) => r.situacaoConferencia === "NF_EMITIDA");
  const errosEmissao = rows.filter((r) => r.situacaoConferencia === "ERRO_DE_EMISSAO");
  const nfAusente = rows.filter((r) => r.situacaoConferencia === "NF_NAO_EMITIDA");
  const erroCancelamento = rows.filter((r) => r.situacaoConferencia === "ERRO_DE_CANCELAMENTO");
  const nfCanceladas = rows.filter((r) => r.situacaoConferencia === "NF_CANCELADA");

  const situacaoCounts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.situacaoConferencia] = (acc[r.situacaoConferencia] ?? 0) + 1;
    return acc;
  }, {});

  const platformTotals = Object.entries(
    concluidas.reduce<Record<string, number>>((acc, r) => {
      acc[r.plataforma] = (acc[r.plataforma] ?? 0) + r.valorVenda;
      return acc;
    }, {}),
  )
    .map(([plataforma, total]) => ({ plataforma, total }))
    .sort((a, b) => b.total - a.total);

  const serviceRows = Object.entries(
    emitidas.reduce<Record<string, { count: number; valor: number }>>((acc, r) => {
      for (const inv of r.matchedInvoices) {
        const key = inv.codigoServico;
        acc[key] = acc[key] ?? { count: 0, valor: 0 };
        acc[key].count += 1;
        acc[key].valor += inv.valorNf;
      }
      return acc;
    }, {}),
  ).sort((a, b) => b[1].valor - a[1].valor);

  const currencyRows = Object.entries(
    emitidas.reduce<Record<string, number>>((acc, r) => {
      acc[r.moeda] = (acc[r.moeda] ?? 0) + (r.valorNfFaturado ?? 0);
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageTitle>Painel Geral</PageTitle>
        <a
          href={`/api/c/${companyId}/export/reconciliation${competencia ? `?competencia=${competencia}` : ""}`}
          className="flex items-center gap-2 text-xs font-semibold text-positive hover:opacity-80 bg-positive/10 px-3 py-2 rounded-input border border-positive/20 transition-colors"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" /> Exportar Análise (XLSX)
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        <KpiCard
          label="Total Vendas (Concluídas)"
          value={concluidas.length}
          sub={formatCurrency(sum(concluidas, (r) => r.valorVenda), "BRL")}
          accent="primary"
          href={`/c/${companyId}/sales`}
        />
        <KpiCard
          label="Notas Emitidas"
          value={emitidas.length}
          sub={formatCurrency(sum(emitidas, (r) => r.valorNfFaturado ?? 0), "BRL")}
          accent="positive"
          href={`/c/${companyId}/sales?status=${encodeURIComponent(SITUACAO_CONFERENCIA_LABELS.NF_EMITIDA)}`}
        />
        <KpiCard
          label="Erros de Emissão"
          value={errosEmissao.length}
          sub="Pendentes de reenvio"
          accent="danger"
          href={`/c/${companyId}/sales?status=${encodeURIComponent(SITUACAO_CONFERENCIA_LABELS.ERRO_DE_EMISSAO)}`}
        />
        <KpiCard
          label="NF Não Emitida"
          value={nfAusente.length}
          sub={`${formatCurrency(sum(nfAusente, (r) => r.valorNfCalculado), "BRL")} pendentes`}
          accent="attention"
          href={`/c/${companyId}/sales?status=${encodeURIComponent(SITUACAO_CONFERENCIA_LABELS.NF_NAO_EMITIDA)}`}
        />
        <KpiCard
          label="Erro Cancelamento"
          value={erroCancelamento.length}
          sub="Conflito de status"
          accent="danger"
          href={`/c/${companyId}/sales?status=${encodeURIComponent(SITUACAO_CONFERENCIA_LABELS.ERRO_DE_CANCELAMENTO)}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="p-6 flex flex-col">
          <h4 className="text-sm font-bold text-ink mb-4">Situação NF</h4>
          <div className="flex-1 min-h-[240px]">
            <SituacaoChart counts={situacaoCounts} companyId={companyId} />
          </div>
        </Card>

        <Card className="p-6 flex flex-col">
          <h4 className="text-sm font-bold text-ink mb-4">Desempenho por Plataforma</h4>
          <div className="flex-1 min-h-[240px]">
            <PlatformChart data={platformTotals} />
          </div>
        </Card>

        <Card className="overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-ink/8 bg-paper-alt/40">
            <h4 className="text-sm font-bold text-ink">Faturamento por Serviço</h4>
          </div>
          <div className="divide-y divide-ink/5 overflow-y-auto max-h-[260px] flex-1">
            {serviceRows.length === 0 ? (
              <div className="p-4 text-center text-xs text-ink/40">Nenhuma nota emitida para este período.</div>
            ) : (
              serviceRows.map(([code, v]) => (
                <Link
                  key={code}
                  href={`/c/${companyId}/invoices?codigoServico=${encodeURIComponent(code)}`}
                  className="flex justify-between px-4 py-2.5 text-xs hover:bg-paper-alt/60 transition-colors"
                >
                  <span className="font-medium text-ink">{code}</span>
                  <span className="text-ink/50">
                    {v.count} · {formatCurrency(v.valor, "BRL")}
                  </span>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-ink/8 bg-paper-alt/40">
          <h4 className="text-sm font-bold text-ink">Resumo por Moeda</h4>
        </div>
        <div className="divide-y divide-ink/5">
          {currencyRows.length === 0 ? (
            <div className="p-4 text-center text-xs text-ink/40">Nenhum dado importado para esta competência.</div>
          ) : (
            currencyRows.map(([moeda, total]) => (
              <Link
                key={moeda}
                href={`/c/${companyId}/sales?moeda=${encodeURIComponent(moeda)}&status=${encodeURIComponent(SITUACAO_CONFERENCIA_LABELS.NF_EMITIDA)}`}
                className="flex justify-between px-6 py-3 text-sm hover:bg-paper-alt/60 transition-colors"
              >
                <span className="font-semibold text-ink">{moeda}</span>
                <span className="text-positive font-semibold">{formatCurrency(total, moeda)}</span>
              </Link>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
