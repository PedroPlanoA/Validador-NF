"use server";

import { db } from "@/lib/db";
import { platformConfigSchema, type PlatformConfigFormInput } from "@/lib/validation/schemas";
import { revalidatePath } from "next/cache";

export async function createPlatformConfig(companyId: string, input: PlatformConfigFormInput) {
  const parsed = platformConfigSchema.parse(input);
  const config = await db.platformConfig.create({
    data: {
      companyId,
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
  revalidatePath(`/c/${companyId}/config/platforms`);
  return config;
}

export async function updatePlatformConfig(
  companyId: string,
  configId: string,
  input: PlatformConfigFormInput,
) {
  const parsed = platformConfigSchema.parse(input);
  const config = await db.platformConfig.update({
    where: { id: configId, companyId },
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
  revalidatePath(`/c/${companyId}/config/platforms`);
  return config;
}

export async function listPlatformConfigs(companyId: string) {
  return db.platformConfig.findMany({ where: { companyId }, orderBy: { name: "asc" } });
}

export async function getPlatformConfig(companyId: string, configId: string) {
  return db.platformConfig.findUnique({ where: { id: configId, companyId } });
}
