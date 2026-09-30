import { db } from "@/lib/db";
import { reconcile } from "@/lib/reconciliation/engine";
import type {
  InvoiceForReconciliation,
  ReconciliationRow,
  SaleForReconciliation,
} from "@/lib/reconciliation/types";

/**
 * Exatamente os campos que o motor lê — nem um a mais.
 *
 * Escritos como `Record<keyof …, true>` de propósito: se alguém acrescentar um
 * campo ao tipo de entrada do motor e esquecer de trazê-lo do banco, o
 * TypeScript acusa aqui, em vez de o campo chegar `undefined` na reconciliação e
 * produzir um resultado errado em silêncio.
 */
const CAMPOS_VENDA: Record<keyof SaleForReconciliation, true> = {
  id: true,
  codigoVenda: true,
  codigoVendaNormalized: true,
  comprador: true,
  plataforma: true,
  produto: true,
  moeda: true,
  valorVenda: true,
  valorNf: true,
  situacaoVenda: true,
  situacaoVendaOriginal: true,
  competencia: true,
  dataVenda: true,
};

const CAMPOS_NOTA: Record<keyof InvoiceForReconciliation, true> = {
  id: true,
  codigoVendaNormalized: true,
  numero: true,
  tipo: true,
  situacaoNf: true,
  valorNf: true,
  codigoServico: true,
  competencia: true,
};

/**
 * Reconciles a company's ENTIRE sale/invoice history (not scoped by
 * competência at the DB query level) and only then filters by the
 * requested competência — necessary because the competência used for
 * filtering (competenciaEfetiva) comes from whichever invoice ends up
 * matched to each sale, which is only known after reconciliation runs.
 */
export async function getReconciliationRows(
  companyId: string,
  competencia?: string,
): Promise<ReconciliationRow[]> {
  // Só as colunas que `reconcile` lê. Das 21 de `Sale` ele usa 13, e das 18 de
  // `Invoice`, 8 — e o que não é lido ainda assim atravessava a rede. Numa
  // empresa de 19 mil linhas isso são megabytes por clique.
  const [sales, invoices] = await Promise.all([
    db.sale.findMany({ where: { companyId }, select: CAMPOS_VENDA }),
    db.invoice.findMany({ where: { companyId }, select: CAMPOS_NOTA }),
  ]);

  const rows = reconcile(sales, invoices);
  if (!competencia) return rows;
  return rows.filter((r) => r.competenciaEfetiva === competencia);
}

/**
 * Competências disponíveis para esta empresa, da mais recente para a mais
 * antiga — é o que alimenta o seletor da faixa lateral.
 *
 * União deliberada de **dois** conjuntos:
 *  - a competência efetiva de cada linha de reconciliação (lado das vendas);
 *  - a competência de **toda** nota fiscal da empresa.
 *
 * O segundo é indispensável porque o motor percorre as vendas: nota sem venda
 * casada não gera linha nenhuma. Sem ela, uma empresa com relatório de notas mas
 * sem relatório de vendas ficava com o seletor vazio, apesar de a aba Notas
 * Fiscais, o faturamento do dashboard e o checklist filtrarem exatamente por
 * essa competência.
 */
export async function listCompetencias(companyId: string): Promise<string[]> {
  // **Duas consultas `distinct`, não a reconciliação inteira.**
  //
  // Esta função alimenta o seletor da faixa lateral, que está no layout — ou
  // seja, roda em TODA página aberta dentro de uma empresa. Antes ela chamava
  // `getReconciliationRows`, que carrega todas as vendas e todas as notas para
  // reconciliar em memória. Medido na maior empresa (9.769 vendas, 9.444 notas):
  //
  //   SELECT * de Sale ........ 2.271ms / 3,0 MB
  //   SELECT * de Invoice ..... 1.498ms / 2,3 MB
  //   os dois DISTINCT abaixo ... ~170ms cada / 6 linhas
  //
  // Eram mais de dois segundos e cinco megabytes para produzir uma lista de
  // quatro meses, em cada clique. Os dois índices `(companyId, competencia)` já
  // existiam e cobrem exatamente estas consultas.
  const [deNotas, deVendas] = await Promise.all([
    db.invoice.findMany({ where: { companyId }, select: { competencia: true }, distinct: ["competencia"] }),
    db.sale.findMany({ where: { companyId }, select: { competencia: true }, distinct: ["competencia"] }),
  ]);

  // **Por que isto está certo.** A competência efetiva de uma venda é a da nota
  // casada (que está em `deNotas`) ou, sem nota casada, a da própria venda (que
  // está em `deVendas`). A união é portanto um superconjunto do que a
  // reconciliação produziria — nenhum mês verdadeiro fica de fora.
  //
  // O preço, já previsto neste documento antes de ser pago: pode sobrar um mês
  // em que existiam vendas mas todas foram faturadas em outro. Selecioná-lo
  // mostra a aba Vendas vazia, que é feio mas não é errado — e custa dois
  // segundos a menos em cada tela.
  const set = new Set<string>();
  for (const { competencia } of deNotas) set.add(competencia);
  for (const { competencia } of deVendas) set.add(competencia);
  return Array.from(set).sort().reverse();
}
