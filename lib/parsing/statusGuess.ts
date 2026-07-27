import type { SituacaoNf, SituacaoVenda } from "@/lib/mapping/types";

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

const PLATFORM_KEYWORDS: [string[], SituacaoVenda][] = [
  [["pago", "aprovad", "complet", "paid", "approved"], "CONCLUIDO"],
  [["cancel", "reembols", "refund", "estornad"], "CANCELADO"],
  [["recus", "pend", "aguard"], "INCOMPLETO"],
];

const EMITTER_KEYWORDS: [string[], SituacaoNf][] = [
  [["emitid", "autoriz", "sucess"], "EMITIDO"],
  [["cancel"], "CANCELADO"],
  [["erro", "rejeit"], "ERRO_DE_EMISSAO"],
  [["process", "emissao"], "EM_EMISSAO"],
];

function guess<T extends string>(rawValue: string, table: [string[], T][], fallback: T): T {
  const norm = normalize(rawValue);
  for (const [keywords, status] of table) {
    if (keywords.some((k) => norm.includes(k))) return status;
  }
  return fallback;
}

/** Auto-guesses a statusMap for the wizard: distinct raw values found in a
 *  sample -> best-guess enum value. The analyst can override each entry. */
export function guessPlatformStatusMap(distinctValues: string[]): Record<string, SituacaoVenda> {
  const map: Record<string, SituacaoVenda> = {};
  for (const v of distinctValues) map[v] = guess(v, PLATFORM_KEYWORDS, "OUTRO");
  return map;
}

export function guessEmitterStatusMap(distinctValues: string[]): Record<string, SituacaoNf> {
  const map: Record<string, SituacaoNf> = {};
  for (const v of distinctValues) map[v] = guess(v, EMITTER_KEYWORDS, "OUTRO");
  return map;
}

export function distinctValuesOf(rows: Record<string, string>[], column: string): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    const v = row[column];
    if (v !== undefined && v !== null && String(v).trim() !== "") set.add(String(v));
  }
  return Array.from(set);
}
