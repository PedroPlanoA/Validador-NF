"use server";

import { db } from "@/lib/db";
import { platformConfigSchema, type PlatformConfigFormInput } from "@/lib/validation/schemas";
import { revalidatePath } from "next/cache";

export async function createPlatformConfig(input: PlatformConfigFormInput) {
  const parsed = platformConfigSchema.parse(input);
  const config = await db.platformConfig.create({
    data: {
      name: parsed.name,
      mappings: parsed.mappings,
      commType: parsed.commType,
      fixedCommValue: parsed.fixedCommValue,
      currencyMode: parsed.currencyMode,
      fixedCurrency: parsed.fixedCurrency,
      currencyCol: parsed.currencyCol,
      cleanupChars: parsed.cleanupChars,
      statusMap: parsed.statusMap,
    },
  });
  revalidatePath(`/config/platforms`);
  return config;
}

export async function updatePlatformConfig(configId: string, input: PlatformConfigFormInput) {
  const parsed = platformConfigSchema.parse(input);
  const config = await db.platformConfig.update({
    where: { id: configId },
    data: {
      name: parsed.name,
      mappings: parsed.mappings,
      commType: parsed.commType,
      fixedCommValue: parsed.fixedCommValue,
      currencyMode: parsed.currencyMode,
      fixedCurrency: parsed.fixedCurrency,
      currencyCol: parsed.currencyCol,
      cleanupChars: parsed.cleanupChars,
      statusMap: parsed.statusMap,
    },
  });
  revalidatePath(`/config/platforms`);
  return config;
}

export async function listPlatformConfigs() {
  return db.platformConfig.findMany({ orderBy: { name: "asc" } });
}

export async function getPlatformConfig(configId: string) {
  return db.platformConfig.findUnique({ where: { id: configId } });
}
