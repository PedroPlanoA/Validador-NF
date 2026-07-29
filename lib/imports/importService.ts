import { db } from "@/lib/db";
import { standardizeInvoices, standardizeSales, distinctCompetencias } from "@/lib/mapping/applyMapping";
import { rowsToCsv, csvToRows } from "@/lib/parsing/csvRows";
import type {
  EmitterConfigInput,
  PlatformConfigInput,
  RawRow,
  StandardizedSale,
} from "@/lib/mapping/types";

/** Prisma's default interactive-transaction timeout (5s) is too short for
 *  large reports — the delete+createMany for a big batch can easily take
 *  longer than that against Neon. Raised well above what even a very large
 *  report should need, while staying under the route handlers' maxDuration. */
const TRANSACTION_OPTIONS = { timeout: 45_000, maxWait: 10_000 };

/**
 * Applies any per-product commission overrides (set in the Produtos screen)
 * on top of the mapping-computed commission — the accountant's manually
 * confirmed commission for a specific product always wins over whatever the
 * generic platform mapping would have calculated.
 */
async function applyProductOverrides(
  companyId: string,
  plataforma: string,
  sales: StandardizedSale[],
): Promise<StandardizedSale[]> {
  const produtos = Array.from(new Set(sales.map((s) => s.produto)));
  if (produtos.length === 0) return sales;

  const overrides = await db.productOverride.findMany({
    where: { companyId, plataforma, produto: { in: produtos } },
  });
  if (overrides.length === 0) return sales;

  const overrideMap = new Map(overrides.map((o) => [o.produto, o.commissionPercent]));
  return sales.map((s) => {
    const pct = overrideMap.get(s.produto);
    if (pct === undefined) return s;
    return { ...s, comissao: pct, valorNf: s.valorVenda * (pct / 100) };
  });
}

interface RunImportInput {
  sourceType: "PLATFORM" | "EMITTER";
  configId: string;
  filename: string;
  rawRows: RawRow[];
  referenceCompetencia: string;
}

/**
 * Imports a parsed file for a single (company, config) source. Replaces
 * only the sale/invoice rows for the competências actually present in the
 * new file — re-uploading July's Hotmart report never touches June's
 * Hotmart rows. Scoped strictly to this configId, so importing one emitter
 * never wipes another emitter's data (the bug the old prototype had).
 *
 * Mapping configs (platform/emitter) are global — shared across every
 * company — so they are looked up without a companyId filter; only the
 * resulting Sale/Invoice/ImportBatch rows are scoped to this company.
 */
export async function runImport(companyId: string, input: RunImportInput) {
  if (input.sourceType === "PLATFORM") {
    const config = await db.platformConfig.findUnique({ where: { id: input.configId } });
    if (!config) throw new Error("Configuração de plataforma não encontrada");

    const configInput: PlatformConfigInput = {
      name: config.name,
      mappings: config.mappings as unknown as PlatformConfigInput["mappings"],
      commType: config.commType,
      fixedCommValue: config.fixedCommValue ?? undefined,
      currencyMode: config.currencyMode,
      fixedCurrency: config.fixedCurrency ?? undefined,
      currencyCol: config.currencyCol ?? undefined,
      cleanupChars: config.cleanupChars,
      statusMap: config.statusMap as unknown as PlatformConfigInput["statusMap"],
    };

    const standardizedRaw = standardizeSales(input.rawRows, configInput);
    const standardized = await applyProductOverrides(companyId, config.name, standardizedRaw);
    const competencias = distinctCompetencias(standardized);

    return db.$transaction(
      async (tx) => {
        await tx.sale.deleteMany({
          where: { companyId, platformConfigId: config.id, competencia: { in: competencias } },
        });

        const batch = await tx.importBatch.create({
          data: {
            companyId,
            sourceType: "PLATFORM",
            platformConfigId: config.id,
            originalFilename: input.filename,
            rowCount: standardized.length,
            rawContent: rowsToCsv(input.rawRows),
            competencias,
            referenceCompetencia: input.referenceCompetencia,
          },
        });

        if (standardized.length > 0) {
          await tx.sale.createMany({
            data: standardized.map((s) => ({
              ...s,
              companyId,
              importBatchId: batch.id,
              platformConfigId: config.id,
            })),
          });
        }

        return batch;
      },
      TRANSACTION_OPTIONS,
    );
  }

  const config = await db.emitterConfig.findUnique({ where: { id: input.configId } });
  if (!config) throw new Error("Configuração de emissor não encontrada");

  const configInput: EmitterConfigInput = {
    name: config.name,
    mappings: config.mappings as unknown as EmitterConfigInput["mappings"],
    cleanupChars: config.cleanupChars,
    fallbackService: config.fallbackService,
    statusMap: config.statusMap as unknown as EmitterConfigInput["statusMap"],
  };

  const standardized = standardizeInvoices(input.rawRows, configInput);
  const competencias = distinctCompetencias(standardized);

  return db.$transaction(
    async (tx) => {
      await tx.invoice.deleteMany({
        where: { companyId, emitterConfigId: config.id, competencia: { in: competencias } },
      });

      const batch = await tx.importBatch.create({
        data: {
          companyId,
          sourceType: "EMITTER",
          emitterConfigId: config.id,
          originalFilename: input.filename,
          rowCount: standardized.length,
          rawContent: rowsToCsv(input.rawRows),
          competencias,
          referenceCompetencia: input.referenceCompetencia,
        },
      });

      if (standardized.length > 0) {
        await tx.invoice.createMany({
          data: standardized.map((s) => ({
            ...s,
            companyId,
            importBatchId: batch.id,
            emitterConfigId: config.id,
          })),
        });
      }

      return batch;
    },
    TRANSACTION_OPTIONS,
  );
}

/**
 * Re-runs standardization for an already-imported batch using the CURRENT
 * mapping config (which may have been edited since the original import).
 * This is what makes config edits actually take effect, instead of only
 * affecting the next file upload. Rows are recovered from the stored CSV
 * text (rawContent), not re-uploaded by the user.
 */
export async function reanalyzeBatch(companyId: string, batchId: string) {
  const batch = await db.importBatch.findUnique({ where: { id: batchId, companyId } });
  if (!batch) throw new Error("Lote de importação não encontrado");

  const rawRows = csvToRows(batch.rawContent);

  if (batch.sourceType === "PLATFORM") {
    if (!batch.platformConfigId) throw new Error("Lote sem plataforma associada");
    const config = await db.platformConfig.findUnique({ where: { id: batch.platformConfigId } });
    if (!config) throw new Error("Configuração de plataforma não encontrada");

    const configInput: PlatformConfigInput = {
      name: config.name,
      mappings: config.mappings as unknown as PlatformConfigInput["mappings"],
      commType: config.commType,
      fixedCommValue: config.fixedCommValue ?? undefined,
      currencyMode: config.currencyMode,
      fixedCurrency: config.fixedCurrency ?? undefined,
      currencyCol: config.currencyCol ?? undefined,
      cleanupChars: config.cleanupChars,
      statusMap: config.statusMap as unknown as PlatformConfigInput["statusMap"],
    };

    const standardizedRaw = standardizeSales(rawRows, configInput);
    const standardized = await applyProductOverrides(companyId, config.name, standardizedRaw);
    const competencias = distinctCompetencias(standardized);

    return db.$transaction(
      async (tx) => {
        await tx.sale.deleteMany({ where: { importBatchId: batch.id } });
        if (standardized.length > 0) {
          await tx.sale.createMany({
            data: standardized.map((s) => ({
              ...s,
              companyId,
              importBatchId: batch.id,
              platformConfigId: config.id,
            })),
          });
        }
        return tx.importBatch.update({
          where: { id: batch.id },
          data: { rowCount: standardized.length, competencias },
        });
      },
      TRANSACTION_OPTIONS,
    );
  }

  if (!batch.emitterConfigId) throw new Error("Lote sem emissor associado");
  const config = await db.emitterConfig.findUnique({ where: { id: batch.emitterConfigId } });
  if (!config) throw new Error("Configuração de emissor não encontrada");

  const configInput: EmitterConfigInput = {
    name: config.name,
    mappings: config.mappings as unknown as EmitterConfigInput["mappings"],
    cleanupChars: config.cleanupChars,
    fallbackService: config.fallbackService,
    statusMap: config.statusMap as unknown as EmitterConfigInput["statusMap"],
  };

  const standardized = standardizeInvoices(rawRows, configInput);
  const competencias = distinctCompetencias(standardized);

  return db.$transaction(
    async (tx) => {
      await tx.invoice.deleteMany({ where: { importBatchId: batch.id } });
      if (standardized.length > 0) {
        await tx.invoice.createMany({
          data: standardized.map((s) => ({
            ...s,
            companyId,
            importBatchId: batch.id,
            emitterConfigId: config.id,
          })),
        });
      }
      return tx.importBatch.update({
        where: { id: batch.id },
        data: { rowCount: standardized.length, competencias },
      });
    },
    TRANSACTION_OPTIONS,
  );
}

/** All active import batches for a company — deliberately unfiltered here;
 *  the Importações screen applies fonte/competência/data filters itself so
 *  it can also derive each filter's available options from the same list. */
export async function listActiveBatches(companyId: string) {
  return db.importBatch.findMany({
    where: { companyId },
    include: { platformConfig: true, emitterConfig: true },
    orderBy: { importedAt: "desc" },
  });
}

/** Deletes an import batch and (via cascade) every Sale/Invoice row it produced. */
export async function deleteBatch(companyId: string, batchId: string) {
  await db.importBatch.delete({ where: { id: batchId, companyId } });
}
