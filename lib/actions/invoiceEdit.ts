"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

/**
 * Correção manual de competência e tipo de uma nota já importada.
 *
 * Existe porque o relatório do emissor erra esses dois campos de formas
 * conhecidas: a Spedy manda devolução com tipo "NF-e" (sem indicar que é
 * devolução) e o eNotas manda a competência errada em alguns casos.
 *
 * **A edição é na própria linha e não sobrevive à reimportação** — decisão do
 * usuário. Reimportar o relatório ou reanalisar o lote recria as linhas a partir
 * do arquivo e o ajuste é perdido. Se um mesmo erro voltar a cada mês, o certo
 * é corrigir o mapeamento (ou a regra), não reeditar a nota.
 */
export async function updateInvoiceFields(
  invoiceId: string,
  data: { competencia: string; tipo: string },
): Promise<{ error?: string }> {
  const competencia = data.competencia.trim();
  const tipo = data.tipo.trim();

  // O resto do sistema assume competência no formato YYYY-MM (ou o sentinela);
  // aceitar texto livre aqui quebraria filtro, agrupamento e checklist.
  if (!/^\d{4}-\d{2}$/.test(competencia)) {
    return { error: "Competência deve estar no formato AAAA-MM." };
  }
  if (!tipo) {
    return { error: "Informe o tipo da nota." };
  }

  const invoice = await db.invoice.findUnique({ where: { id: invoiceId }, select: { companyId: true } });
  if (!invoice) return { error: "Nota fiscal não encontrada." };

  await db.invoice.update({ where: { id: invoiceId }, data: { competencia, tipo } });

  revalidatePath(`/c/${invoice.companyId}/invoices`);
  // Competência e tipo alimentam dashboard, split e o seletor da faixa lateral.
  revalidatePath(`/c/${invoice.companyId}`, "layout");
  return {};
}
