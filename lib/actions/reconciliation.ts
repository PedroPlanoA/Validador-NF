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
  const [rows, invoiceCompetencias] = await Promise.all([
    getReconciliationRows(companyId),
    db.invoice.findMany({
      where: { companyId },
      select: { competencia: true },
      distinct: ["competencia"],
    }),
  ]);

  const set = new Set(rows.map((r) => r.competenciaEfetiva));
  for (const { competencia } of invoiceCompetencias) set.add(competencia);
  return Array.from(set).sort().reverse();
}
