"use server";

import { db } from "@/lib/db";
import { emitterConfigSchema, type EmitterConfigFormInput } from "@/lib/validation/schemas";
import { revalidatePath } from "next/cache";

export async function createEmitterConfig(companyId: string, input: EmitterConfigFormInput) {
  const parsed = emitterConfigSchema.parse(input);
  const config = await db.emitterConfig.create({
    data: {
      companyId,
      name: parsed.name,
      mappings: parsed.mappings,
      cleanupChars: parsed.cleanupChars,
      fallbackService: parsed.fallbackService,
      statusMap: parsed.statusMap,
    },
  });
  revalidatePath(`/c/${companyId}/config/emitters`);
  return config;
}

export async function updateEmitterConfig(
  companyId: string,
  configId: string,
  input: EmitterConfigFormInput,
) {
  const parsed = emitterConfigSchema.parse(input);
  const config = await db.emitterConfig.update({
    where: { id: configId, companyId },
    data: {
      name: parsed.name,
      mappings: parsed.mappings,
      cleanupChars: parsed.cleanupChars,
      fallbackService: parsed.fallbackService,
      statusMap: parsed.statusMap,
    },
  });
  revalidatePath(`/c/${companyId}/config/emitters`);
  return config;
}

export async function listEmitterConfigs(companyId: string) {
  return db.emitterConfig.findMany({ where: { companyId }, orderBy: { name: "asc" } });
}

export async function getEmitterConfig(companyId: string, configId: string) {
  return db.emitterConfig.findUnique({ where: { id: configId, companyId } });
}
