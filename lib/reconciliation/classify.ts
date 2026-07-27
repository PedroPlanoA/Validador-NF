import type { SituacaoNf, SituacaoVenda } from "@/lib/mapping/types";
import type { SituacaoConferencia } from "@/lib/reconciliation/types";

/**
 * Collapses multiple invoices of DIFFERENT tipo matched to the same sale
 * (e.g. one NFS-e + one NF-e — a legitimate split-invoicing pattern, not an
 * error) into a single virtual status for classification. Priority: an
 * emission error or cancellation on ANY of them must surface even if the
 * others look fine — silently averaging that away would hide a real problem.
 */
export function combineStatus(statuses: SituacaoNf[]): SituacaoNf {
  if (statuses.includes("ERRO_DE_EMISSAO")) return "ERRO_DE_EMISSAO";
  if (statuses.includes("CANCELADO")) return "CANCELADO";
  if (statuses.includes("EM_EMISSAO")) return "EM_EMISSAO";
  if (statuses.length > 0 && statuses.every((s) => s === "EMITIDO")) return "EMITIDO";
  return "OUTRO";
}

/**
 * Classification table — unchanged business logic from the original
 * prototype (validated with the client), now fed either a single invoice's
 * status or a combined/virtual one from combineStatus().
 */
export function classify(
  situacaoVenda: SituacaoVenda,
  situacaoNf: SituacaoNf | null,
): SituacaoConferencia {
  if (situacaoVenda === "CONCLUIDO") {
    if (situacaoNf === null) return "NF_NAO_EMITIDA";
    if (situacaoNf === "EMITIDO") return "NF_EMITIDA";
    if (situacaoNf === "ERRO_DE_EMISSAO") return "ERRO_DE_EMISSAO";
    if (situacaoNf === "CANCELADO") return "ERRO_DE_CANCELAMENTO";
    return "OUTRO";
  }

  if (situacaoVenda === "CANCELADO") {
    if (situacaoNf === "EMITIDO") return "ERRO_DE_CANCELAMENTO";
    if (situacaoNf === "CANCELADO" || situacaoNf === null) return "NF_CANCELADA";
    return "OUTRO";
  }

  // INCOMPLETO / OUTRO sale status
  if (situacaoNf === "ERRO_DE_EMISSAO") return "ERRO_DE_EMISSAO";
  return "OUTRO";
}
