import { notFound } from "next/navigation";
import { Split } from "lucide-react";
import { getSplitAnalysis, hasSplitDeNotas } from "@/lib/actions/split";
import { formatCurrency } from "@/lib/validation/currency";
import { formatCompetencia, formatTrimestre } from "@/lib/format/competencia";
import { formatPercent } from "@/lib/format/percent";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { PanelCard } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageTitle";
import { SplitBar } from "@/components/split/SplitBar";
import { TABLE_CLASS, THEAD_CLASS, TBODY_CLASS, TR_CLASS } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import type { PeriodoSplit } from "@/lib/split/computeSplit";

export const dynamic = "force-dynamic";

const TH = "py-3 px-4 whitespace-nowrap";
const TD = "py-2.5 px-4 whitespace-nowrap";
const TD_NUM = `${TD} text-right tabular-nums`;

function PeriodoTable({
  periodos,
  rotulo,
  cabecalho,
  vendasTotais,
}: {
  periodos: PeriodoSplit[];
  rotulo: (chave: string) => string;
  cabecalho: string;
  /** Contagem **distinta** de vendas, vinda da análise. Somar a coluna dos
   *  períodos contaria duas vezes a venda cujas notas caem em meses diferentes,
   *  e o total passaria a discordar do KPI no topo da tela. */
  vendasTotais: number;
}) {
  const totais = periodos.reduce(
    (acc, p) => ({
      receita: acc.receita + p.receita,
      nfe: acc.nfe + p.nfe,
      nfse: acc.nfse + p.nfse,
    }),
    { receita: 0, nfe: 0, nfse: 0 },
  );

  return (
    <div className="overflow-x-auto">
      <table className={TABLE_CLASS}>
        <thead className={THEAD_CLASS}>
          <tr>
            <th className={TH}>{cabecalho}</th>
            <th className={`${TH} text-right`}>Receita</th>
            <th className={`${TH} text-right`}>NF-e</th>
            <th className={`${TH} text-right`}>NFS-e</th>
            <th className={`${TH} text-right`}>% NF-e</th>
            <th className={`${TH} text-right`}>% NFS-e</th>
            <th className={`${TH} text-right`}>Vendas</th>
            <th className={`${TH} min-w-[150px]`}>Divisão</th>
          </tr>
        </thead>
        <tbody className={TBODY_CLASS}>
          {periodos.map((p) => (
            <tr key={p.chave} className={TR_CLASS}>
              <td className={TD}>{rotulo(p.chave)}</td>
              <td className={TD_NUM}>{formatCurrency(p.receita, "BRL")}</td>
              <td className={TD_NUM}>{formatCurrency(p.nfe, "BRL")}</td>
              <td className={TD_NUM}>{formatCurrency(p.nfse, "BRL")}</td>
              <td className={TD_NUM}>{formatPercent(p.receita > 0 ? p.nfe / p.receita : null)}</td>
              <td className={TD_NUM}>{formatPercent(p.receita > 0 ? p.nfse / p.receita : null)}</td>
              <td className={TD_NUM}>{p.vendas.toLocaleString("pt-BR")}</td>
              <td className={`${TD} min-w-[150px]`}>
                <SplitBar nfe={p.nfe} nfse={p.nfse} height="h-5" />
              </td>
            </tr>
          ))}
          <tr className="bg-paper-alt/60 font-bold">
            <td className={TD}>Total</td>
            <td className={TD_NUM}>{formatCurrency(totais.receita, "BRL")}</td>
            <td className={TD_NUM}>{formatCurrency(totais.nfe, "BRL")}</td>
            <td className={TD_NUM}>{formatCurrency(totais.nfse, "BRL")}</td>
            <td className={TD_NUM}>{formatPercent(totais.receita > 0 ? totais.nfe / totais.receita : null)}</td>
            <td className={TD_NUM}>{formatPercent(totais.receita > 0 ? totais.nfse / totais.receita : null)}</td>
            <td className={TD_NUM}>{vendasTotais.toLocaleString("pt-BR")}</td>
            <td className={TD} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default async function SplitPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;

  // Mesma condição que esconde a aba no menu — sem os dois modelos não há
  // divisão a demonstrar, e a URL direta não deve escapar dessa regra.
  if (!(await hasSplitDeNotas(companyId))) notFound();

  const r = await getSplitAnalysis(companyId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Split de Notas"
        sub="Divisão do faturamento entre NF-e (produto) e NFS-e (serviço), por período e por produto."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <KpiCard
          label="Receita Emitida"
          value={formatCurrency(r.totais.receita, "BRL")}
          sub={`${r.vendas.toLocaleString("pt-BR")} venda(s)`}
          accent="primary"
        />
        <KpiCard
          label="NF-e (Produto)"
          value={formatCurrency(r.totais.nfe, "BRL")}
          sub={`${formatPercent(r.ponderadaGeral)} do total`}
          accent="attention"
        />
        <KpiCard
          label="NFS-e (Serviço)"
          value={formatCurrency(r.totais.nfse, "BRL")}
          sub={`${formatPercent(r.ponderadaGeral === null ? null : 1 - r.ponderadaGeral)} do total`}
          accent="positive"
        />
        <KpiCard
          label="Ticket Médio"
          value={formatCurrency(r.ticketMedio, "BRL")}
          sub="por venda"
          accent="neutral"
        />
        <KpiCard
          label="Notas Emitidas"
          value={(r.notasNfe + r.notasNfse).toLocaleString("pt-BR")}
          sub={`${r.notasNfe.toLocaleString("pt-BR")} NF-e · ${r.notasNfse.toLocaleString("pt-BR")} NFS-e`}
          accent="neutral"
        />
        <KpiCard
          label="Vendas com 2 Modelos"
          value={r.vendasComDoisModelos.toLocaleString("pt-BR")}
          sub="NF-e + NFS-e na mesma venda"
          accent="attention"
        />
      </div>

      <PanelCard title="Divisão NF-e × NFS-e — resumo geral">
        <div className="p-6 space-y-5">
          <SplitBar nfe={r.totais.nfe} nfse={r.totais.nfse} />

          <div className="overflow-x-auto">
            <table className={TABLE_CLASS}>
              <thead className={THEAD_CLASS}>
                <tr>
                  <th className={TH}>Métrica</th>
                  <th className={`${TH} text-right`}>% NF-e</th>
                  <th className={`${TH} text-right`}>% NFS-e</th>
                  <th className={TH}>Base de cálculo</th>
                </tr>
              </thead>
              <tbody className={TBODY_CLASS}>
                {[
                  {
                    nome: "Ponderada — todas as vendas",
                    valor: r.ponderadaGeral,
                    base: "todo o faturamento emitido",
                  },
                  {
                    nome: "Ponderada — só produtos que dividem",
                    valor: r.ponderadaQuemDivide,
                    base: "receita dos produtos com NF-e",
                  },
                  {
                    nome: "Média simples por venda",
                    valor: r.mediaPorVenda,
                    base: "cada venda dividida pesa igual",
                  },
                ].map((m) => (
                  <tr key={m.nome} className={TR_CLASS}>
                    <td className={TD}>{m.nome}</td>
                    <td className={TD_NUM}>{formatPercent(m.valor)}</td>
                    <td className={TD_NUM}>{formatPercent(m.valor === null ? null : 1 - m.valor)}</td>
                    <td className={`${TD} text-ink/50`}>{m.base}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-sm text-text-2">
            {r.produtosQueDividem.length === 0 ? (
              <>Nenhum produto dividiu a venda em dois modelos no período.</>
            ) : (
              <>
                A NF-e representa <strong>{formatPercent(r.ponderadaGeral)}</strong> da receita emitida. Considerando
                apenas os produtos que dividem a venda, ela é{" "}
                <strong>{formatPercent(r.ponderadaQuemDivide)}</strong> — é essa a regra de rateio praticada.
              </>
            )}
          </p>

          {r.excluidas.length > 0 && (
            <p className="text-xs text-ink/50">
              Fora desta análise:{" "}
              {r.excluidas
                .map((e) => `${e.tipo} (${e.quantidade.toLocaleString("pt-BR")})`)
                .join(", ")}
              . Devolução não é faturamento, e tipo não classificável não entra em porcentagem.
            </p>
          )}
        </div>
      </PanelCard>

      <PanelCard title="Receita por competência">
        <PeriodoTable
          periodos={r.competencias}
          rotulo={formatCompetencia}
          cabecalho="Competência"
          vendasTotais={r.vendas}
        />
      </PanelCard>

      <PanelCard title="Receita por trimestre">
        <PeriodoTable
          periodos={r.trimestres}
          rotulo={formatTrimestre}
          cabecalho="Trimestre"
          vendasTotais={r.vendas}
        />
      </PanelCard>

      <PanelCard title="Receita por produto">
        <div className="overflow-x-auto">
          <table className={TABLE_CLASS}>
            <thead className={THEAD_CLASS}>
              <tr>
                <th className={TH}>Produto</th>
                <th className={`${TH} text-right`}>Receita</th>
                <th className={`${TH} text-right`}>% do total</th>
                <th className={`${TH} text-right`}>% NF-e</th>
                <th className={`${TH} text-right`}>% NFS-e</th>
                <th className={`${TH} text-right`}>% NF-e médio por venda</th>
                <th className={`${TH} text-right`}>Vendas</th>
              </tr>
            </thead>
            <tbody className={TBODY_CLASS}>
              {r.produtos.map((p) => (
                <tr key={p.produto} className={TR_CLASS}>
                  <td className={`${TD} max-w-[320px]`}>
                    <div className="flex items-center gap-2">
                      <span className="truncate" title={p.produto}>
                        {p.produto}
                      </span>
                      {p.divide && <Badge tone="attention">divide</Badge>}
                    </div>
                  </td>
                  <td className={TD_NUM}>{formatCurrency(p.receita, "BRL")}</td>
                  <td className={TD_NUM}>
                    {formatPercent(r.totais.receita > 0 ? p.receita / r.totais.receita : null)}
                  </td>
                  <td className={TD_NUM}>{formatPercent(p.receita > 0 ? p.nfe / p.receita : null)}</td>
                  <td className={TD_NUM}>{formatPercent(p.receita > 0 ? p.nfse / p.receita : null)}</td>
                  <td className={TD_NUM}>{formatPercent(p.mediaPorVenda)}</td>
                  <td className={TD_NUM}>{p.vendas.toLocaleString("pt-BR")}</td>
                </tr>
              ))}
              <tr className="bg-paper-alt/60 font-bold">
                <td className={TD}>Total</td>
                <td className={TD_NUM}>{formatCurrency(r.totais.receita, "BRL")}</td>
                <td className={TD_NUM}>100,0%</td>
                <td className={TD_NUM}>{formatPercent(r.ponderadaGeral)}</td>
                <td className={TD_NUM}>
                  {formatPercent(r.ponderadaGeral === null ? null : 1 - r.ponderadaGeral)}
                </td>
                <td className={TD_NUM}>{formatPercent(r.mediaPorVenda)}</td>
                <td className={TD_NUM}>{r.vendas.toLocaleString("pt-BR")}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </PanelCard>

      <PanelCard title="Divisão por período — as três leituras">
        <div className="overflow-x-auto">
          <table className={TABLE_CLASS}>
            <thead className={THEAD_CLASS}>
              <tr>
                <th className={TH}>Trimestre</th>
                <th className={`${TH} text-right`}>% NF-e (todas)</th>
                <th className={`${TH} text-right`}>% NFS-e (todas)</th>
                <th className={`${TH} text-right`}>% NF-e (só quem divide)</th>
                <th className={`${TH} text-right`}>% NF-e médio por venda</th>
                <th className={`${TH} text-right`}>Notas NF-e</th>
              </tr>
            </thead>
            <tbody className={TBODY_CLASS}>
              {r.trimestres.map((t) => (
                <tr key={t.chave} className={TR_CLASS}>
                  <td className={TD}>{formatTrimestre(t.chave)}</td>
                  <td className={TD_NUM}>{formatPercent(t.receita > 0 ? t.nfe / t.receita : null)}</td>
                  <td className={TD_NUM}>{formatPercent(t.receita > 0 ? t.nfse / t.receita : null)}</td>
                  <td className={TD_NUM}>{formatPercent(t.ponderadaQuemDivide)}</td>
                  <td className={TD_NUM}>{formatPercent(t.mediaPorVenda)}</td>
                  <td className={TD_NUM}>{t.notasNfe.toLocaleString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 pb-5 pt-1 space-y-2">
          <p className="text-xs text-ink/50">
            As três colunas de percentual respondem perguntas diferentes: sobre <strong>todo</strong> o faturamento a
            NF-e dilui nos produtos que não dividem; sobre <strong>só quem divide</strong> aparece o rateio real; e a{" "}
            <strong>média por venda</strong> ignora o tamanho da venda, dando o mesmo peso a todas.
          </p>
          {r.produtosQueDividem.length > 0 && (
            <p className="text-xs text-ink/50">
              <Split className="inline w-3 h-3 mr-1 -mt-0.5" />
              Produtos que dividem a venda: <strong>{r.produtosQueDividem.join(", ")}</strong>.
            </p>
          )}
        </div>
      </PanelCard>
    </div>
  );
}
