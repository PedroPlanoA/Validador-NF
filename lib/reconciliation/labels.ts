import type { BadgeTone } from "@/components/ui/Badge";
import type { SituacaoConferencia } from "@/lib/reconciliation/types";

export const SITUACAO_CONFERENCIA_LABELS: Record<SituacaoConferencia, string> = {
  NF_EMITIDA: "NF Emitida",
  NF_NAO_EMITIDA: "NF Não Emitida",
  ERRO_DE_EMISSAO: "Erro de Emissão",
  ERRO_DE_CANCELAMENTO: "Erro Cancelamento",
  NF_CANCELADA: "NF Cancelada",
  MULTIPLAS_NOTAS_REVISAO: "Múltiplas Notas — Revisão",
  OUTRO: "Outro",
};

export const SITUACAO_CONFERENCIA_TONE: Record<SituacaoConferencia, BadgeTone> = {
  NF_EMITIDA: "success",
  NF_NAO_EMITIDA: "error",
  ERRO_DE_EMISSAO: "warning",
  ERRO_DE_CANCELAMENTO: "warning-warm",
  NF_CANCELADA: "neutral",
  MULTIPLAS_NOTAS_REVISAO: "warning-warm",
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
