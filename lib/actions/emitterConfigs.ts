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
