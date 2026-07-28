import { db } from "@/lib/db";
import { reconcile } from "@/lib/reconciliation/engine";
import type { ReconciliationRow } from "@/lib/reconciliation/types";

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
  const [sales, invoices] = await Promise.all([
    db.sale.findMany({ where: { companyId } }),
    db.invoice.findMany({ where: { companyId } }),
  ]);

  const rows = reconcile(sales, invoices);
  if (!competencia) return rows;
  return rows.filter((r) => r.competenciaEfetiva === competencia);
}

/** Distinct competências (efetivas) available for this company, newest first. */
export async function listCompetencias(companyId: string): Promise<string[]> {
  const rows = await getReconciliationRows(companyId);
  const set = new Set(rows.map((r) => r.competenciaEfetiva));
  return Array.from(set).sort().reverse();
}
