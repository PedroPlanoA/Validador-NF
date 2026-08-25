import { db } from "@/lib/db";
import { computeSplit, type SplitResult } from "@/lib/split/computeSplit";
import { modeloDaNota } from "@/lib/split/modeloNota";

export interface SplitAnalysis {
  /** Série inteira — alimenta as tabelas por competência e por trimestre, que
   *  só fazem sentido mostrando a evolução. */
  serie: SplitResult;
  /** Recortado pela competência selecionada (ou igual a `serie` em "Todas") —
   *  alimenta os KPIs, o resumo geral e a visão por produto. */
  periodo: SplitResult;
  competencia?: string;
}

/**
 * Análise de split de uma empresa. Como o dashboard, considera **apenas notas
 * emitidas** — cancelada, com erro ou pendente não é faturamento e distorceria
 * qualquer percentual de rateio.
 *
 * Devolve dois recortes de propósito. O seletor de competência precisa valer
 * aqui como vale em toda aba, mas aplicá-lo às tabelas por mês e por trimestre
 * as reduziria a uma linha e mataria justamente o que elas mostram — a mudança
 * da regra de rateio ao longo do tempo. Então o período recorta os números do
 * topo e a série alimenta as tabelas de evolução.
 *
 * O produto vem do relatório de **vendas** (a nota fiscal não tem produto),
 * casado pelo código normalizado — o mesmo cruzamento que o dashboard usa para
 * plataforma e moeda.
 */
export async function getSplitAnalysis(companyId: string, competencia?: string): Promise<SplitAnalysis> {
  const [notas, vendas] = await Promise.all([
    db.invoice.findMany({
      where: { companyId, situacaoNf: "EMITIDO" },
      select: { codigoVendaNormalized: true, tipo: true, valorNf: true, competencia: true },
    }),
    db.sale.findMany({
      where: { companyId },
      select: { codigoVendaNormalized: true, produto: true },
    }),
  ]);

  const produtoPorCodigo = new Map(vendas.map((v) => [v.codigoVendaNormalized, v.produto]));
  const serie = computeSplit(notas, produtoPorCodigo);
  const periodo = competencia
    ? computeSplit(
        notas.filter((n) => n.competencia === competencia),
        produtoPorCodigo,
      )
    : serie;

  return { serie, periodo, competencia };
}

/**
 * A aba Split de Notas só existe quando a empresa tem os **dois** modelos de
 * nota emitidos — com um só, não há divisão a demonstrar e a aba seria uma tela
 * de zeros. Consulta barata: os tipos distintos, sem carregar as notas.
 */
export async function hasSplitDeNotas(companyId: string): Promise<boolean> {
  const tipos = await db.invoice.findMany({
    where: { companyId, situacaoNf: "EMITIDO" },
    select: { tipo: true },
    distinct: ["tipo"],
  });

  const modelos = new Set(tipos.map((t) => modeloDaNota(t.tipo)));
  return modelos.has("PRODUTO") && modelos.has("SERVICO");
}
