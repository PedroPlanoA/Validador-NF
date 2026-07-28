import { getReconciliationRows, listCompetencias } from "@/lib/actions/reconciliation";
import { formatCurrency } from "@/lib/validation/currency";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SituacaoChart } from "@/components/dashboard/SituacaoChart";
import { PlatformChart } from "@/components/dashboard/PlatformChart";
import { CompetenciaFilter } from "@/components/dashboard/CompetenciaFilter";
import { Card } from "@/components/ui/Card";
import { FileSpreadsheet } from "lucide-react";
import type { ReconciliationRow } from "@/lib/reconciliation/types";

export const dynamic = "force-dynamic";

function sum(rows: ReconciliationRow[], pick: (r: ReconciliationRow) => number) {
  return rows.reduce((acc, r) => acc + pick(r), 0);
}

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ competencia?: string }>;
}) {
  const { companyId } = await params;
  const { competencia } = await searchParams;

  const [rows, competencias] = await Promise.all([
    getReconciliationRows(companyId, competencia),
    listCompetencias(companyId),
  ]);

  const concluidas = rows.filter((r) => r.situacaoVenda === "CONCLUIDO");
  const emitidas = rows.filter((r) => r.situacaoConferencia === "NF_EMITIDA");
  const errosEmissao = rows.filter((r) => r.situacaoConferencia === "ERRO_DE_EMISSAO");
  const nfAusente = rows.filter((r) => r.situacaoConferencia === "NF_NAO_EMITIDA");
  const erroCancelamento = rows.filter((r) => r.situacaoConferencia === "ERRO_DE_CANCELAMENTO");
  const nfCanceladas = rows.filter((r) => r.situacaoConferencia === "NF_CANCELADA");
  const multiplasNotas = rows.filter((r) => r.situacaoConferencia === "MULTIPLAS_NOTAS_REVISAO");

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
        <h1 className="text-lg font-bold text-ink">Painel Geral</h1>
        <div className="flex items-center gap-3">
          <a
            href={`/api/c/${companyId}/export/reconciliation${competencia ? `?competencia=${competencia}` : ""}`}
            className="flex items-center gap-2 text-xs font-semibold text-positive hover:opacity-80 bg-positive/10 px-3 py-2 rounded-input border border-positive/20 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Exportar Análise (XLSX)
          </a>
          <CompetenciaFilter competencias={competencias} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-5">
        <KpiCard
          label="Total Vendas (Concluídas)"
          value={concluidas.length}
          sub={formatCurrency(sum(concluidas, (r) => r.valorVenda), "BRL")}
          accent="primary"
        />
        <KpiCard
          label="Notas Emitidas"
          value={emitidas.length}
          sub={formatCurrency(sum(emitidas, (r) => r.valorNfFaturado ?? 0), "BRL")}
          accent="positive"
        />
        <KpiCard label="Erros de Emissão" value={errosEmissao.length} sub="Pendentes de reenvio" accent="danger" />
        <KpiCard
          label="NF Não Emitida"
          value={nfAusente.length}
          sub={`${formatCurrency(sum(nfAusente, (r) => r.valorNfCalculado), "BRL")} pendentes`}
          accent="attention"
        />
        <KpiCard label="Erro Cancelamento" value={erroCancelamento.length} sub="Conflito de status" accent="danger" />
        <KpiCard
          label="Múltiplas Notas"
          value={multiplasNotas.length}
          sub="Aguardando revisão manual"
          accent="attention"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="p-6 flex flex-col">
          <h4 className="text-sm font-bold text-ink mb-4">Situação da Conferência</h4>
          <div className="flex-1 min-h-[240px]">
            <SituacaoChart counts={situacaoCounts} />
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
            <h4 className="text-sm font-bold text-ink">Notas Emitidas por Cód. Serviço</h4>
          </div>
          <div className="divide-y divide-ink/5 overflow-y-auto max-h-[260px] flex-1">
            {serviceRows.length === 0 ? (
              <div className="p-4 text-center text-xs text-ink/40">Nenhuma nota emitida para este período.</div>
            ) : (
              serviceRows.map(([code, v]) => (
                <div key={code} className="flex justify-between px-4 py-2.5 text-xs">
                  <span className="font-medium text-ink">{code}</span>
                  <span className="text-ink/50">
                    {v.count} · {formatCurrency(v.valor, "BRL")}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-ink/8 bg-paper-alt/40">
          <h4 className="text-sm font-bold text-ink">Resumo por Moeda (Notas Emitidas)</h4>
        </div>
        <div className="divide-y divide-ink/5">
          {currencyRows.length === 0 ? (
            <div className="p-4 text-center text-xs text-ink/40">Nenhum dado importado para esta competência.</div>
          ) : (
            currencyRows.map(([moeda, total]) => (
              <div key={moeda} className="flex justify-between px-6 py-3 text-sm">
                <span className="font-semibold text-ink">{moeda}</span>
                <span className="text-positive font-semibold">{formatCurrency(total, moeda)}</span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
