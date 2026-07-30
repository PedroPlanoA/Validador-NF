import Link from "next/link";
import { db } from "@/lib/db";
import { getReconciliationRows } from "@/lib/actions/reconciliation";
import { getCompetenciaCookie } from "@/lib/actions/competenciaCookie";
import { formatCurrency } from "@/lib/validation/currency";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SituacaoChart } from "@/components/dashboard/SituacaoChart";
import { PlatformChart } from "@/components/dashboard/PlatformChart";
import { TipoChart } from "@/components/dashboard/TipoChart";
import { PanelCard } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageTitle";
import { formatCompetencia } from "@/lib/format/competencia";
import { FileSpreadsheet } from "lucide-react";
import { SITUACAO_CONFERENCIA_LABELS, SITUACAO_NF_LABELS } from "@/lib/reconciliation/labels";

export const dynamic = "force-dynamic";

function sum<T>(rows: T[], pick: (r: T) => number) {
  return rows.reduce((acc, r) => acc + pick(r), 0);
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const competencia = await getCompetenciaCookie(companyId);

  // Unfiltered — each section below decides for itself whether/how the
  // selected competência applies (vendas-based sections filter by the
  // sale's own competência; notas-based sections filter by the nota's own
  // competência; the erro-de-reconciliação KPIs are never filtered, they
  // always surface every discrepancy found).
  const [allRows, allInvoices, allSales] = await Promise.all([
    getReconciliationRows(companyId),
    db.invoice.findMany({ where: { companyId } }),
    db.sale.findMany({
      where: { companyId },
      select: { codigoVendaNormalized: true, moeda: true, plataforma: true },
    }),
  ]);

  // --- Análise de erros (venda x nota) — nunca filtrado por competência ---
  const errosEmissao = allRows.filter((r) => r.situacaoConferencia === "ERRO_DE_EMISSAO");
  const nfAusente = allRows.filter((r) => r.situacaoConferencia === "NF_NAO_EMITIDA");
  const erroCancelamento = allRows.filter((r) => r.situacaoConferencia === "ERRO_DE_CANCELAMENTO");

  // --- Notas-based (relatório de notas fiscais), competência = da nota ---
  const invoicesNaCompetencia = allInvoices.filter((i) => !competencia || i.competencia === competencia);
  const notasEmitidas = invoicesNaCompetencia.filter((i) => i.situacaoNf === "EMITIDO");

  const situacaoNfCounts = invoicesNaCompetencia.reduce<Record<string, number>>((acc, i) => {
    acc[i.situacaoNf] = (acc[i.situacaoNf] ?? 0) + 1;
    return acc;
  }, {});

  // Faturamento e moeda são sobre notas efetivamente emitidas — uma nota
  // cancelada/com erro/pendente não é faturamento real, então não deve
  // inflar esses dois totais (mesmo comportamento de antes da reforma).
  const serviceRows = Object.entries(
    notasEmitidas.reduce<Record<string, { count: number; valor: number }>>((acc, i) => {
      const key = i.codigoServico;
      acc[key] = acc[key] ?? { count: 0, valor: 0 };
      acc[key].count += 1;
      acc[key].valor += i.valorNf;
      return acc;
    }, {}),
  ).sort((a, b) => b[1].valor - a[1].valor);

  // Emissões por tipo de nota (NF-e, NFS-e, NF-e Devolução...). O painel só
  // existe quando há mais de um tipo — com um único tipo o gráfico seria um
  // círculo de 100% e não informaria nada.
  const tipoRows = Object.entries(
    notasEmitidas.reduce<Record<string, number>>((acc, i) => {
      const tipo = i.tipo.trim() || "Não Informado";
      acc[tipo] = (acc[tipo] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([tipo, count]) => ({ tipo, count }))
    .sort((a, b) => b.count - a.count);
  const showTipoPanel = tipoRows.length > 1;

  // Notas fiscais não têm moeda própria — é sempre a do relatório de vendas,
  // recuperada pelo código da venda casado. Sem casamento, fica explícito
  // que a moeda não pôde ser identificada em vez de assumir BRL.
  const moedaPorCodigoVenda = new Map(allSales.map((s) => [s.codigoVendaNormalized, s.moeda]));
  const MOEDA_NAO_IDENTIFICADA = "Moeda Não Identificada";
  const currencyRows = Object.entries(
    notasEmitidas.reduce<Record<string, number>>((acc, i) => {
      const moeda = moedaPorCodigoVenda.get(i.codigoVendaNormalized) ?? MOEDA_NAO_IDENTIFICADA;
      acc[moeda] = (acc[moeda] ?? 0) + i.valorNf;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  // Desempenho por plataforma agora reflete notas fiscais emitidas — mais
  // fiel à situação fiscal real — cruzando o código da venda com o
  // relatório de vendas apenas para descobrir de qual plataforma ele veio.
  const plataformaPorCodigoVenda = new Map(allSales.map((s) => [s.codigoVendaNormalized, s.plataforma]));
  const PLATAFORMA_NAO_IDENTIFICADA = "Plataforma Não Identificada";
  const platformTotals = Object.entries(
    notasEmitidas.reduce<Record<string, number>>((acc, i) => {
      const plataforma = plataformaPorCodigoVenda.get(i.codigoVendaNormalized) ?? PLATAFORMA_NAO_IDENTIFICADA;
      acc[plataforma] = (acc[plataforma] ?? 0) + i.valorNf;
      return acc;
    }, {}),
  )
    .map(([plataforma, total]) => ({ plataforma, total }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Painel Geral"
        sub={competencia ? `Competência ${formatCompetencia(competencia)}` : "Todas as competências"}
      >
        <a
          href={`/api/c/${companyId}/export/reconciliation${competencia ? `?competencia=${competencia}` : ""}`}
          className="flex items-center gap-2 text-sm font-bold text-positive border border-positive/25 hover:bg-positive/10 rounded-input px-4 py-2.5 transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4" /> Exportar Análise (XLSX)
        </a>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard
          label="Notas Emitidas"
          value={notasEmitidas.length}
          sub={formatCurrency(sum(notasEmitidas, (i) => i.valorNf), "BRL")}
          accent="positive"
          href={`/c/${companyId}/invoices?status=${encodeURIComponent(SITUACAO_NF_LABELS.EMITIDO)}`}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PanelCard title="Situação NF">
          <div className="p-6 h-[300px]">
            <SituacaoChart counts={situacaoNfCounts} companyId={companyId} />
          </div>
        </PanelCard>

        <PanelCard title="Desempenho por Plataforma">
          <div className="p-6 h-[300px]">
            <PlatformChart data={platformTotals} />
          </div>
        </PanelCard>

        <PanelCard title="Faturamento por Serviço">
          <div className="divide-y divide-ink/5 overflow-y-auto max-h-[300px]">
            {serviceRows.length === 0 ? (
              <div className="p-6 text-center text-xs text-ink/40 italic">
                Nenhuma nota emitida para este período.
              </div>
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
        </PanelCard>
      </div>

      <div className={`grid grid-cols-1 gap-6 ${showTipoPanel ? "lg:grid-cols-2" : ""}`}>
        <PanelCard title="Resumo por Moeda">
        <div className="divide-y divide-ink/5">
          {currencyRows.length === 0 ? (
            <div className="p-6 text-center text-xs text-ink/40 italic">
              Nenhum dado importado para esta competência.
            </div>
          ) : (
            currencyRows.map(([moeda, total]) =>
              moeda === MOEDA_NAO_IDENTIFICADA ? (
                <div key={moeda} className="flex justify-between px-6 py-3 text-sm">
                  <span className="font-semibold text-ink/50">{moeda}</span>
                  <span className="text-ink/50 font-semibold">{formatCurrency(total, "BRL")}</span>
                </div>
              ) : (
                <Link
                  key={moeda}
                  href={`/c/${companyId}/sales?moeda=${encodeURIComponent(moeda)}`}
                  className="flex justify-between px-6 py-3 text-sm hover:bg-paper-alt/60 transition-colors"
                >
                  <span className="font-semibold text-ink">{moeda}</span>
                  <span className="text-positive font-semibold">{formatCurrency(total, moeda)}</span>
                </Link>
              ),
            )
          )}
          </div>
        </PanelCard>

        {showTipoPanel && (
          <PanelCard title="Emissões por Tipo">
            <div className="p-6 h-[300px]">
              <TipoChart data={tipoRows} companyId={companyId} />
            </div>
          </PanelCard>
        )}
      </div>
    </div>
  );
}
