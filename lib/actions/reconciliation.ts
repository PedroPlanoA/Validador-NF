import { db } from "@/lib/db";
import { reconcile } from "@/lib/reconciliation/engine";
import type { ReconciliationRow } from "@/lib/reconciliation/types";

export async function getReconciliationRows(
  companyId: string,
  competencia?: string,
): Promise<ReconciliationRow[]> {
  const [sales, invoices] = await Promise.all([
    db.sale.findMany({ where: { companyId, ...(competencia ? { competencia } : {}) } }),
    db.invoice.findMany({ where: { companyId, ...(competencia ? { competencia } : {}) } }),
  ]);

  return reconcile(sales, invoices);
}

export async function listCompetencias(companyId: string): Promise<string[]> {
  const sales = await db.sale.findMany({
    where: { companyId },
    select: { competencia: true },
    distinct: ["competencia"],
  });
  return sales.map((s) => s.competencia).sort().reverse();
}
