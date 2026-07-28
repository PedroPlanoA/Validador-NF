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

/**
 * Deletes a platform mapping — refused with a clear message if any sale (in
 * any company) was imported using it, since deleting the config wouldn't
 * cascade to that data (Sale.platformConfigId is a required, RESTRICT FK).
 * The user must delete the related import batches first if they really
 * want to remove the config.
 */
export async function deletePlatformConfig(configId: string) {
  const usageCount = await db.sale.count({ where: { platformConfigId: configId } });
  if (usageCount > 0) {
    throw new Error(
      `Não é possível excluir: ${usageCount} venda(s) importada(s) usam este mapeamento. Exclua as importações relacionadas primeiro.`,
    );
  }
  await db.platformConfig.delete({ where: { id: configId } });
  revalidatePath(`/config/platforms`);
}
