"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export interface ProductRow {
  produto: string;
  vendaCount: number;
  valorMedio: number;
  comissaoMediaAplicada: number;
  overrideCommissionPercent: number | null;
}

/** Distinct platform names with at least one imported sale for this company. */
export async function listCompanyPlatforms(companyId: string): Promise<string[]> {
  const rows = await db.sale.findMany({
    where: { companyId },
    select: { plataforma: true },
    distinct: ["plataforma"],
    orderBy: { plataforma: "asc" },
  });
  return rows.map((r) => r.plataforma);
}

/** One row per distinct product sold on this platform, for this company. */
export async function listProductsForPlatform(companyId: string, plataforma: string): Promise<ProductRow[]> {
  const [grouped, overrides] = await Promise.all([
    db.sale.groupBy({
      by: ["produto"],
      where: { companyId, plataforma },
      _avg: { valorVenda: true, comissao: true },
      _count: { _all: true },
      orderBy: { produto: "asc" },
    }),
    db.productOverride.findMany({ where: { companyId, plataforma } }),
  ]);

  const overrideMap = new Map(overrides.map((o) => [o.produto, o.commissionPercent]));

  return grouped.map((g) => ({
    produto: g.produto,
    vendaCount: g._count._all,
    valorMedio: g._avg.valorVenda ?? 0,
    comissaoMediaAplicada: g._avg.comissao ?? 0,
    overrideCommissionPercent: overrideMap.get(g.produto) ?? null,
  }));
}

export async function upsertProductOverride(
  companyId: string,
  plataforma: string,
  produto: string,
  commissionPercent: number,
) {
  await db.productOverride.upsert({
    where: { companyId_plataforma_produto: { companyId, plataforma, produto } },
    create: { companyId, plataforma, produto, commissionPercent },
    update: { commissionPercent },
  });
  revalidatePath(`/c/${companyId}/products`);
}

/** Reverts a product back to whatever the platform mapping calculates by default. */
export async function clearProductOverride(companyId: string, plataforma: string, produto: string) {
  await db.productOverride.deleteMany({ where: { companyId, plataforma, produto } });
  revalidatePath(`/c/${companyId}/products`);
}
