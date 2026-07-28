"use server";

import { db } from "@/lib/db";
import { emitterConfigSchema, type EmitterConfigFormInput } from "@/lib/validation/schemas";
import { revalidatePath } from "next/cache";

export async function createEmitterConfig(input: EmitterConfigFormInput) {
  const parsed = emitterConfigSchema.parse(input);
  const config = await db.emitterConfig.create({
    data: {
      name: parsed.name,
      mappings: parsed.mappings,
      cleanupChars: parsed.cleanupChars,
      fallbackService: parsed.fallbackService,
      statusMap: parsed.statusMap,
    },
  });
  revalidatePath(`/config/emitters`);
  return config;
}

export async function updateEmitterConfig(configId: string, input: EmitterConfigFormInput) {
  const parsed = emitterConfigSchema.parse(input);
  const config = await db.emitterConfig.update({
    where: { id: configId },
    data: {
      name: parsed.name,
      mappings: parsed.mappings,
      cleanupChars: parsed.cleanupChars,
      fallbackService: parsed.fallbackService,
      statusMap: parsed.statusMap,
    },
  });
  revalidatePath(`/config/emitters`);
  return config;
}

export async function listEmitterConfigs() {
  return db.emitterConfig.findMany({ orderBy: { name: "asc" } });
}

export async function getEmitterConfig(configId: string) {
  return db.emitterConfig.findUnique({ where: { id: configId } });
}

/**
 * Deletes an emitter mapping — refused if any invoice uses it, same
 * reasoning as deletePlatformConfig. Returns a result object instead of
 * throwing (see the comment there for why).
 */
export async function deleteEmitterConfig(configId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const usageCount = await db.invoice.count({ where: { emitterConfigId: configId } });
  if (usageCount > 0) {
    return {
      ok: false,
      error: `Não é possível excluir: ${usageCount} nota(s) importada(s) usam este mapeamento. Exclua as importações relacionadas primeiro.`,
    };
  }
  await db.emitterConfig.delete({ where: { id: configId } });
  revalidatePath(`/config/emitters`);
  return { ok: true };
}
