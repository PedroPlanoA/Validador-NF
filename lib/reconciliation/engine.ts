import { classify, combineStatus } from "@/lib/reconciliation/classify";
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
  };
}

function buildRow(
  sale: SaleForReconciliation,
  matched: InvoiceForReconciliation[],
  situacaoConferencia: ReconciliationRow["situacaoConferencia"],
  valorNfFaturado: number | null,
): ReconciliationRow {
  return {
    saleId: sale.id,
    codigoVenda: sale.codigoVenda,
    comprador: sale.comprador,
    plataforma: sale.plataforma,
    moeda: sale.moeda,
    valorVenda: sale.valorVenda,
    valorNfCalculado: sale.valorNf,
    situacaoVenda: sale.situacaoVenda,
    situacaoConferencia,
    matchedInvoices: matched.map(toRef),
    valorNfFaturado,
    competencia: sale.competencia,
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
