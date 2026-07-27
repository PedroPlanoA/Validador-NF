import type { SituacaoNf, SituacaoVenda } from "@/lib/mapping/types";

export type SituacaoConferencia =
  | "NF_EMITIDA"
  | "NF_NAO_EMITIDA"
  | "ERRO_DE_EMISSAO"
  | "ERRO_DE_CANCELAMENTO"
  | "NF_CANCELADA"
  | "MULTIPLAS_NOTAS_REVISAO"
  | "OUTRO";

/** Minimal shape the engine needs from a Sale row — Prisma's generated Sale
 *  type satisfies this structurally, no conversion needed at call sites. */
export interface SaleForReconciliation {
  id: string;
  codigoVenda: string;
  codigoVendaNormalized: string;
  comprador: string;
  plataforma: string;
  moeda: string;
  valorVenda: number;
  valorNf: number;
  situacaoVenda: SituacaoVenda;
  competencia: string;
}

/** Minimal shape the engine needs from an Invoice row. */
export interface InvoiceForReconciliation {
  id: string;
  codigoVendaNormalized: string;
  numero: string;
  tipo: string;
  situacaoNf: SituacaoNf;
  valorNf: number;
  codigoServico: string;
  competencia: string;
}

export interface MatchedInvoiceRef {
  invoiceId: string;
  numero: string;
  tipo: string;
  situacaoNf: SituacaoNf;
  valorNf: number;
  codigoServico: string;
}

export interface ReconciliationRow {
  saleId: string;
  codigoVenda: string;
  comprador: string;
  plataforma: string;
  moeda: string;
  valorVenda: number;
  valorNfCalculado: number;
  situacaoVenda: SituacaoVenda;
  situacaoConferencia: SituacaoConferencia;
  matchedInvoices: MatchedInvoiceRef[];
  /** Single invoice's valorNf, summed value when combined (different tipo), or null if no match. */
  valorNfFaturado: number | null;
  competencia: string;
}
