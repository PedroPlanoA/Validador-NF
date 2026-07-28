"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type ChecklistItems = Record<string, boolean>;

export async function getChecklistState(companyId: string, competencia: string): Promise<ChecklistItems> {
  const state = await db.checklistState.findUnique({ where: { companyId_competencia: { companyId, competencia } } });
  return (state?.itemsJson as ChecklistItems) ?? {};
}

export async function saveChecklistState(companyId: string, competencia: string, itemsJson: ChecklistItems) {
  await db.checklistState.upsert({
    where: { companyId_competencia: { companyId, competencia } },
    create: { companyId, competencia, itemsJson },
    update: { itemsJson },
  });
  revalidatePath(`/c/${companyId}/checklist`);
}
