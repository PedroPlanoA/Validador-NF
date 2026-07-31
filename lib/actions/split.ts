import { db } from "@/lib/db";
import { computeSplit, type SplitResult } from "@/lib/split/computeSplit";
import { modeloDaNota } from "@/lib/split/modeloNota";

/**
 * Análise de split de uma empresa. Como o dashboard, considera **apenas notas
 * emitidas** — cancelada, com erro ou pendente não é faturamento e distorceria
 * qualquer percentual de rateio.
 *
 * Não é filtrada por competência: a tela mostra a série inteira por mês e por
 * trimestre, que é onde a mudança na regra de rateio aparece.
 *
 * O produto vem do relatório de **vendas** (a nota fiscal não tem produto),
 * casado pelo código normalizado — o mesmo cruzamento que o dashboard usa para
 * plataforma e moeda.
 */
export async function getSplitAnalysis(companyId: string): Promise<SplitResult> {
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

  return computeSplit(notas, new Map(vendas.map((v) => [v.codigoVendaNormalized, v.produto])));
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
