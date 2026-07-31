import { parseNumber } from "@/lib/parsing/numberParser";
import { extractCompetence, parseFullDate, SEM_COMPETENCIA } from "@/lib/parsing/competence";
import { normalizeCode, normalizeInvoiceNumber } from "@/lib/mapping/normalizeCode";
import { isDevolucao } from "@/lib/mapping/tipoNota";
import type {
  EmitterConfigInput,
  EmitterMappings,
  MappedInvoiceRow,
  MappedSaleRow,
  PlatformConfigInput,
  PlatformMappings,
  RawRow,
  StandardizedInvoice,
  StandardizedSale,
} from "@/lib/mapping/types";

/**
 * Column-mapping lookup only — pulls the raw string values the config cares
 * about out of the source file's original columns, keyed by standard field
 * name. This is the only step that ever needs to know the source file's own
 * column names; its output (not the original file) is what gets persisted
 * as import history, see MappedSaleRow's doc comment.
 *
 * Roda **no navegador**, uma linha por vez, enquanto o arquivo é lido: é o que
 * permite subir só as colunas mapeadas em vez do relatório inteiro (dezenas de
 * colunas que ninguém usa), o que multiplica por várias vezes o tamanho de
 * arquivo que cabe no limite de corpo de requisição da plataforma. Recebe só os
 * mapeamentos, e não a config inteira, para não enviar comissão/status/limpeza
 * de código ao cliente — isso continua no servidor.
 */
export function mapSaleRow(row: RawRow, mappings: PlatformMappings, currencyCol?: string): MappedSaleRow {
  return {
    codigoVenda: String(row[mappings.codigoVenda] ?? ""),
    comprador: String(row[mappings.comprador] ?? ""),
    produto: String(row[mappings.produto] ?? ""),
    valorBase: String(row[mappings.valorBase] ?? ""),
    situacaoVenda: String(row[mappings.situacaoVenda] ?? ""),
    dataVenda: String(row[mappings.dataVenda] ?? ""),
    valorRecebido: mappings.valorRecebido ? String(row[mappings.valorRecebido] ?? "") : "",
    valorLiquido: mappings.valorLiquido ? String(row[mappings.valorLiquido] ?? "") : "",
    valorFaturamentoCoprodutor: mappings.valorFaturamentoCoprodutor
      ? String(row[mappings.valorFaturamentoCoprodutor] ?? "")
      : "",
    moedaCol: currencyCol ? String(row[currencyCol] ?? "") : "",
  };
}

/**
 * Everything after column lookup: parsing, commission math, status
 * resolution, normalization. Takes already-extracted MappedSaleRow values,
 * so it can re-run against the CURRENT config (e.g. after editing the
 * mapping) without ever needing the source file's original column names —
 * safe to use on rows extracted under a since-changed report format.
 */
export function standardizeMappedSales(rows: MappedSaleRow[], config: PlatformConfigInput): StandardizedSale[] {
  return rows.map((row) => {
    const valorBase = parseNumber(row.valorBase);

    let comissao: number;
    if (config.commType === "CALC") {
      const recebido = parseNumber(row.valorRecebido);
      const faturamentoProdutor = parseNumber(row.valorLiquido);
      const faturamentoCoprodutor = parseNumber(row.valorFaturamentoCoprodutor);
      const faturamentoTotal = faturamentoProdutor + faturamentoCoprodutor;
      comissao = faturamentoTotal > 0 ? (recebido / faturamentoTotal) * 100 : 100;
    } else if (config.commType === "FIXED") {
      comissao = config.fixedCommValue ?? 100;
    } else {
      comissao = 100; // INTEGRAL
    }

    let moeda: string;
    if (config.currencyMode === "FIXED") {
      moeda = config.fixedCurrency || "BRL";
    } else if (config.currencyMode === "COL" && config.currencyCol) {
      moeda = row.moedaCol || "BRL";
    } else {
      moeda = "BRL";
    }

    const rawCodigo = row.codigoVenda.trim();
    const situacaoVenda = config.statusMap[row.situacaoVenda] ?? "OUTRO";

    return {
      codigoVenda: rawCodigo,
      codigoVendaNormalized: normalizeCode(rawCodigo, config.cleanupChars),
      comprador: row.comprador.trim() || "Comprador Desconhecido",
      produto: row.produto.trim() || "Não Identificado",
      plataforma: config.name,
      moeda,
      valorVenda: valorBase,
      comissao,
      valorNf: valorBase * (comissao / 100),
      situacaoVenda,
      situacaoVendaOriginal: row.situacaoVenda.trim(),
      competencia: extractCompetence(row.dataVenda),
      dataVenda: parseFullDate(row.dataVenda),
    };
  });
}

/** Invoice equivalent of mapSaleRow — see its comment. */
export function mapInvoiceRow(row: RawRow, mappings: EmitterMappings): MappedInvoiceRow {
  return {
    codigoVenda: String(row[mappings.codigoVenda] ?? ""),
    comprador: String(row[mappings.comprador] ?? ""),
    situacaoNf: String(row[mappings.situacaoNf] ?? ""),
    competencia: String(row[mappings.competencia] ?? ""),
    valorNf: String(row[mappings.valorNf] ?? ""),
    numero: String(row[mappings.numero] ?? ""),
    tipo: String(row[mappings.tipo] ?? ""),
    codigoServico: mappings.codigoServico ? String(row[mappings.codigoServico] ?? "") : "",
    dataEmissao: mappings.dataEmissao ? String(row[mappings.dataEmissao] ?? "") : "",
  };
}

/** Invoice equivalent of standardizeMappedSales — see its comment. */
export function standardizeMappedInvoices(rows: MappedInvoiceRow[], config: EmitterConfigInput): StandardizedInvoice[] {
  return rows.map((row) => {
    const rawCodigo = row.codigoVenda.trim();
    const situacaoNf = config.statusMap[row.situacaoNf] ?? "OUTRO";
    const tipo = row.tipo.trim() || "NF-e";

    return {
      codigoVenda: rawCodigo,
      codigoVendaNormalized: normalizeCode(rawCodigo, config.cleanupChars),
      comprador: row.comprador.trim() || "Desconhecido",
      situacaoNf,
      competencia: competenciaDaNota(tipo, row),
      valorNf: parseNumber(row.valorNf),
      numero: normalizeInvoiceNumber(row.numero),
      tipo,
      codigoServico: (row.codigoServico || config.fallbackService || "Sem Código").trim() || "Sem Código",
    };
  });
}

/**
 * Competência da nota. Para **nota de devolução** o relatório do emissor traz um
 * dado errado: a coluna de competência vem com a competência da **venda
 * original**, não a do mês em que a devolução foi emitida — o que jogava a
 * devolução para um mês em que ela não aconteceu e desencontrava o dashboard.
 * Nesses casos a fonte correta é a data de emissão/autorização.
 *
 * A coluna de emissão é opcional no mapeamento: quando não está mapeada, ou
 * quando o valor não pode ser lido como data, cai de volta na coluna de
 * competência — comportamento anterior, para não inventar um mês.
 */
function competenciaDaNota(tipo: string, row: MappedInvoiceRow): string {
  if (isDevolucao(tipo)) {
    // Ausente (e não vazio) ao reanalisar lote importado antes deste campo.
    const emissao = extractCompetence(row.dataEmissao ?? "");
    if (emissao !== SEM_COMPETENCIA) return emissao;
  }
  return extractCompetence(row.competencia);
}

/** Distinct competências present in a set of standardized rows — used to scope import replacement. */
export function distinctCompetencias(rows: { competencia: string }[]): string[] {
  return Array.from(new Set(rows.map((r) => r.competencia)));
}
