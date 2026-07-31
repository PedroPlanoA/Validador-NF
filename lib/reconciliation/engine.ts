import { classify, combineStatus } from "@/lib/reconciliation/classify";
import { isDevolucao } from "@/lib/mapping/tipoNota";
import type {
  InvoiceForReconciliation,
  MatchedInvoiceRef,
  ReconciliationRow,
  SaleForReconciliation,
} from "@/lib/reconciliation/types";

function toRef(inv: InvoiceForReconciliation): MatchedInvoiceRef {
  return {
    invoiceId: inv.id,
    numero: inv.numero,
    tipo: inv.tipo,
    situacaoNf: inv.situacaoNf,
    valorNf: inv.valorNf,
    codigoServico: inv.codigoServico,
    competencia: inv.competencia,
  };
}

/** Anything smaller than this is treated as float/rounding noise, not a real divergence. */
const VALUE_DIVERGENCE_TOLERANCE = 0.01;

/** Notas fiscais are sempre emitidas em Real — comparar um valor calculado
 *  em outra moeda contra o valor faturado da nota é comparar unidades
 *  diferentes, não uma divergência real. Só sinaliza divergência quando a
 *  venda está em Real (aceita as variações de texto usadas para configurar
 *  a moeda fixa/coluna: "BRL", "R$", "Real"). */
const BRL_ALIASES = new Set(["BRL", "R$", "REAL"]);

/**
 * Competência é um dado contábil, e a única fonte confiável é a nota fiscal
 * emitida (relatório do emissor). Uma venda ainda sem nota casada não tem
 * competência fiscal definida, então cai de volta na competência da própria
 * venda, só como provisório até ser conferida.
 *
 * Com mais de uma nota casada, a ordem de preferência é:
 *  1. a primeira nota que **não** é devolução — é a emissão que caracteriza a
 *     venda; a devolução é outro evento fiscal, normalmente em outro mês;
 *  2. se só houver devolução, a competência mais antiga entre elas.
 *
 * O critério existe porque antes se usava `matched[0]`, e a consulta de notas
 * não tem ordenação garantida. Enquanto o emissor mandava a devolução com a
 * competência da venda original isso era inofensivo (as duas coincidiam); agora
 * que a devolução vai para o mês certo, o par passa a cruzar dois meses e a
 * escolha não pode depender da ordem em que o banco devolveu as linhas.
 */
function resolveCompetenciaEfetiva(
  sale: SaleForReconciliation,
  matched: InvoiceForReconciliation[],
): string {
  if (matched.length === 0) return sale.competencia;

  const naoDevolucao = matched.filter((m) => !isDevolucao(m.tipo));
  if (naoDevolucao.length > 0) return naoDevolucao[0].competencia;

  return matched.reduce(
    (mais_antiga, m) => (m.competencia < mais_antiga ? m.competencia : mais_antiga),
    matched[0].competencia,
  );
}

function buildRow(
  sale: SaleForReconciliation,
  matched: InvoiceForReconciliation[],
  situacaoConferencia: ReconciliationRow["situacaoConferencia"],
  valorNfFaturado: number | null,
): ReconciliationRow {
  const isMoedaReal = BRL_ALIASES.has(sale.moeda.trim().toUpperCase());
  const valorDivergente =
    isMoedaReal &&
    valorNfFaturado !== null &&
    Math.abs(sale.valorNf - valorNfFaturado) > VALUE_DIVERGENCE_TOLERANCE;

  const competenciaEfetiva = resolveCompetenciaEfetiva(sale, matched);

  return {
    saleId: sale.id,
    codigoVenda: sale.codigoVenda,
    comprador: sale.comprador,
    plataforma: sale.plataforma,
    produto: sale.produto,
    moeda: sale.moeda,
    valorVenda: sale.valorVenda,
    valorNfCalculado: sale.valorNf,
    situacaoVenda: sale.situacaoVenda,
    situacaoVendaOriginal: sale.situacaoVendaOriginal,
    situacaoConferencia,
    matchedInvoices: matched.map(toRef),
    valorNfFaturado,
    valorDivergente,
    competencia: sale.competencia,
    competenciaEfetiva,
    dataVenda: sale.dataVenda,
  };
}

/**
 * Pure reconciliation engine — no DB access. Groups invoices by normalized
 * sale code, then per sale:
 *  - 0 matches: classify with situacaoNf = null.
 *  - 1 match: classify normally against that invoice's status.
 *  - N matches, same `tipo`: a genuine data problem (e.g. two NF-e for one
 *    sale) — flagged MULTIPLAS_NOTAS_REVISAO instead of silently picking one.
 *  - N matches, different `tipo` (e.g. NFS-e + NF-e for the same sale, a
 *    legitimate split-invoicing pattern): sum their valorNf and classify
 *    against a combined virtual status.
 */
export function reconcile(
  sales: SaleForReconciliation[],
  invoices: InvoiceForReconciliation[],
): ReconciliationRow[] {
  const byCode = new Map<string, InvoiceForReconciliation[]>();
  for (const inv of invoices) {
    const key = inv.codigoVendaNormalized;
    const bucket = byCode.get(key);
    if (bucket) bucket.push(inv);
    else byCode.set(key, [inv]);
  }

  return sales.map((sale) => {
    const matches = byCode.get(sale.codigoVendaNormalized) ?? [];

    if (matches.length === 0) {
      return buildRow(sale, [], classify(sale.situacaoVenda, null), null);
    }

    if (matches.length === 1) {
      const inv = matches[0];
      return buildRow(sale, [inv], classify(sale.situacaoVenda, inv.situacaoNf), inv.valorNf);
    }

    const distinctTipos = new Set(matches.map((m) => m.tipo));
    if (distinctTipos.size === 1) {
      return buildRow(sale, matches, "MULTIPLAS_NOTAS_REVISAO", null);
    }

    const combinedValor = matches.reduce((sum, m) => sum + m.valorNf, 0);
    const combinedSituacao = combineStatus(matches.map((m) => m.situacaoNf));
    return buildRow(sale, matches, classify(sale.situacaoVenda, combinedSituacao), combinedValor);
  });
}
