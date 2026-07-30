import type { BadgeTone } from "@/components/ui/Badge";
import type { SituacaoConferencia } from "@/lib/reconciliation/types";
import type { SituacaoNf, SituacaoVenda } from "@/lib/mapping/types";

export const SITUACAO_VENDA_LABELS: Record<SituacaoVenda, string> = {
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
  INCOMPLETO: "Incompleto",
  OUTRO: "Outro",
};

export const SITUACAO_NF_LABELS: Record<SituacaoNf, string> = {
  EMITIDO: "Emitido",
  CANCELADO: "Cancelado",
  ERRO_DE_EMISSAO: "Erro de Emissão",
  EM_EMISSAO: "Em Emissão",
  PENDENTE: "Pendente",
  OUTRO: "Outro",
};

export const SITUACAO_NF_TONE: Record<SituacaoNf, BadgeTone> = {
  EMITIDO: "positive",
  CANCELADO: "neutral",
  ERRO_DE_EMISSAO: "danger",
  EM_EMISSAO: "primary",
  PENDENTE: "attention",
  OUTRO: "neutral",
};

export const SITUACAO_CONFERENCIA_LABELS: Record<SituacaoConferencia, string> = {
  NF_EMITIDA: "NF Emitida",
  NF_NAO_EMITIDA: "NF Não Emitida",
  ERRO_DE_EMISSAO: "Erro de Emissão",
  ERRO_DE_CANCELAMENTO: "Erro Cancelamento",
  NF_CANCELADA: "NF Cancelada",
  MULTIPLAS_NOTAS_REVISAO: "Múltiplas Notas — Revisão",
  VENDA_INCOMPLETA: "Venda Incompleta",
  OUTRO: "Outro",
};

export const SITUACAO_CONFERENCIA_TONE: Record<SituacaoConferencia, BadgeTone> = {
  NF_EMITIDA: "positive",
  NF_NAO_EMITIDA: "attention",
  ERRO_DE_EMISSAO: "danger",
  ERRO_DE_CANCELAMENTO: "danger",
  NF_CANCELADA: "neutral",
  MULTIPLAS_NOTAS_REVISAO: "attention",
  VENDA_INCOMPLETA: "neutral",
  OUTRO: "neutral",
};

/** Statuses that count as "errors requiring attention" in the checklist's
 *  executive summary — explicitly excludes NF_CANCELADA (a clean state) and
 *  OUTRO. MULTIPLAS_NOTAS_REVISAO is tracked separately, not folded in here,
 *  since it's a distinct kind of pending item the client wants visible on
 *  its own, not lumped into the "erros" count. */
export const ERROR_STATUSES: SituacaoConferencia[] = [
  "NF_NAO_EMITIDA",
  "ERRO_DE_CANCELAMENTO",
  "ERRO_DE_EMISSAO",
];
