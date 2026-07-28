import { parseNumber } from "@/lib/parsing/numberParser";
import { extractCompetence } from "@/lib/parsing/competence";
import { normalizeCode, normalizeInvoiceNumber } from "@/lib/mapping/normalizeCode";
import type {
  EmitterConfigInput,
  PlatformConfigInput,
  RawRow,
  StandardizedInvoice,
  StandardizedSale,
} from "@/lib/mapping/types";

export function standardizeSales(
  rawRows: RawRow[],
  config: PlatformConfigInput,
): StandardizedSale[] {
  const { mappings } = config;

  return rawRows.map((row) => {
    const valorBase = parseNumber(row[mappings.valorBase]);

    let comissao: number;
    if (config.commType === "CALC") {
      const recebido = parseNumber(row[mappings.valorRecebido ?? ""]);
      const liquido = parseNumber(row[mappings.valorLiquido ?? ""]);
      comissao = liquido > 0 ? (recebido / liquido) * 100 : 100;
    } else if (config.commType === "FIXED") {
      comissao = config.fixedCommValue ?? 100;
    } else {
      comissao = 100; // INTEGRAL
    }

    let moeda: string;
    if (config.currencyMode === "FIXED") {
      moeda = config.fixedCurrency || "BRL";
    } else if (config.currencyMode === "COL" && config.currencyCol) {
      moeda = row[config.currencyCol] || "BRL";
    } else {
      moeda = "BRL";
    }

    const rawCodigo = String(row[mappings.codigoVenda] ?? "").trim();
    const situacaoRaw = row[mappings.situacaoVenda];
    const situacaoVenda = config.statusMap[situacaoRaw] ?? "OUTRO";

    return {
      codigoVenda: rawCodigo,
      codigoVendaNormalized: normalizeCode(rawCodigo, config.cleanupChars),
      comprador: String(row[mappings.comprador] ?? "").trim() || "Comprador Desconhecido",
      produto: String(row[mappings.produto] ?? "").trim() || "Não Identificado",
      plataforma: config.name,
      moeda,
      valorVenda: valorBase,
      comissao,
      valorNf: valorBase * (comissao / 100),
      situacaoVenda,
      competencia: extractCompetence(row[mappings.dataVenda]),
    };
  });
}

export function standardizeInvoices(
  rawRows: RawRow[],
  config: EmitterConfigInput,
): StandardizedInvoice[] {
  const { mappings } = config;

  return rawRows.map((row) => {
    const rawCodigo = String(row[mappings.codigoVenda] ?? "").trim();
    const situacaoRaw = row[mappings.situacaoNf];
    const situacaoNf = config.statusMap[situacaoRaw] ?? "OUTRO";
    const codigoServicoRaw = mappings.codigoServico ? row[mappings.codigoServico] : "";

    return {
      codigoVenda: rawCodigo,
      codigoVendaNormalized: normalizeCode(rawCodigo, config.cleanupChars),
      comprador: String(row[mappings.comprador] ?? "").trim() || "Desconhecido",
      situacaoNf,
      competencia: extractCompetence(row[mappings.competencia]),
      valorNf: parseNumber(row[mappings.valorNf]),
      numero: normalizeInvoiceNumber(row[mappings.numero]),
      tipo: String(row[mappings.tipo] ?? "").trim() || "NF-e",
      codigoServico: (codigoServicoRaw || config.fallbackService || "Sem Código").trim() || "Sem Código",
    };
  });
}

/** Distinct competências present in a set of standardized rows — used to scope import replacement. */
export function distinctCompetencias(rows: { competencia: string }[]): string[] {
  return Array.from(new Set(rows.map((r) => r.competencia)));
}
