export type SituacaoVenda = "CONCLUIDO" | "CANCELADO" | "INCOMPLETO" | "OUTRO";
export type SituacaoNf = "EMITIDO" | "CANCELADO" | "ERRO_DE_EMISSAO" | "EM_EMISSAO" | "OUTRO";
export type CommType = "INTEGRAL" | "FIXED" | "CALC";
export type CurrencyMode = "FIXED" | "COL" | "NONE";

export interface PlatformMappings {
  codigoVenda: string;
  comprador: string;
  produto: string;
  valorBase: string;
  situacaoVenda: string;
  dataVenda: string;
  valorRecebido?: string; // only required when commType === 'CALC'
  valorLiquido?: string; // only required when commType === 'CALC'
}

export interface PlatformConfigInput {
  name: string;
  mappings: PlatformMappings;
  commType: CommType;
  fixedCommValue?: number;
  currencyMode: CurrencyMode;
  fixedCurrency?: string;
  currencyCol?: string;
  cleanupChars: string;
  statusMap: Record<string, SituacaoVenda>;
}

export interface EmitterMappings {
  codigoVenda: string;
  comprador: string;
  situacaoNf: string;
  competencia: string;
  valorNf: string;
  numero: string;
  tipo: string;
  codigoServico?: string;
}

export interface EmitterConfigInput {
  name: string;
  mappings: EmitterMappings;
  cleanupChars: string;
  fallbackService: string;
  statusMap: Record<string, SituacaoNf>;
}

/** Standardized sale row, pre-persistence (no id/companyId/importBatchId yet). */
export interface StandardizedSale {
  codigoVenda: string;
  codigoVendaNormalized: string;
  comprador: string;
  plataforma: string;
  produto: string;
  moeda: string;
  valorVenda: number;
  comissao: number;
  valorNf: number;
  situacaoVenda: SituacaoVenda;
  competencia: string;
  /** Actual sale date (day precision), parsed from the same mapped column
   *  used for `competencia` — null when it couldn't be parsed as a date. */
  dataVenda: Date | null;
}

/** Standardized invoice row, pre-persistence. */
export interface StandardizedInvoice {
  codigoVenda: string;
  codigoVendaNormalized: string;
  comprador: string;
  situacaoNf: SituacaoNf;
  competencia: string;
  valorNf: number;
  numero: string;
  tipo: string;
  codigoServico: string;
}

export type RawRow = Record<string, string>;
