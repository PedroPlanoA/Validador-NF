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
  produto: string;
  moeda: string;
  valorVenda: number;
  valorNf: number;
  situacaoVenda: SituacaoVenda;
  situacaoVendaOriginal: string;
  competencia: string;
  dataVenda: Date | null;
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
  competencia: string;
}

export interface ReconciliationRow {
  saleId: string;
  codigoVenda: string;
  comprador: string;
  plataforma: string;
  produto: string;
  moeda: string;
  valorVenda: number;
  valorNfCalculado: number;
  situacaoVenda: SituacaoVenda;
  situacaoVendaOriginal: string;
  situacaoConferencia: SituacaoConferencia;
  matchedInvoices: MatchedInvoiceRef[];
  /** Single invoice's valorNf, summed value when combined (different tipo), or null if no match. */
  valorNfFaturado: number | null;
  /** True when there IS an invoiced value and it differs from the calculated
   *  value by more than a cent — independent of situacaoConferencia, since a
   *  sale can be correctly "NF Emitida" and still have the wrong amount. */
  valorDivergente: boolean;
  /** Competência derivada da data de venda — mantida apenas como referência. */
  competencia: string;
  /** Competência EFETIVA para toda análise/checklist/filtro: a da nota fiscal
   *  emitida quando existe uma casada (é o único dado contábil confiável de
   *  competência); cai para a competência da venda apenas quando ainda não
   *  há nota casada (venda ainda não conferida). */
  competenciaEfetiva: string;
  dataVenda: Date | null;
}
