"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

/** Returns the set of "codigoVenda|competencia" keys already marked as
 *  manually verified for a company, for cheap client-side lookup. */
export async function getVerifiedKeys(companyId: string): Promise<Set<string>> {
  const rows = await db.valueCheckAnnotation.findMany({
    where: { companyId },
    select: { codigoVenda: true, competencia: true },
  });
  return new Set(rows.map((r) => `${r.codigoVenda}|${r.competencia}`));
}

export async function markValueDivergenceVerified(
  companyId: string,
  codigoVenda: string,
  competencia: string,
) {
  await db.valueCheckAnnotation.upsert({
    where: { companyId_codigoVenda_competencia: { companyId, codigoVenda, competencia } },
    create: { companyId, codigoVenda, competencia },
    update: {},
  });
  revalidatePath(`/c/${companyId}/errors`);
}

export async function unmarkValueDivergenceVerified(
  companyId: string,
  codigoVenda: string,
  competencia: string,
) {
  await db.valueCheckAnnotation.deleteMany({ where: { companyId, codigoVenda, competencia } });
  revalidatePath(`/c/${companyId}/errors`);
}
