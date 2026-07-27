export const SEM_COMPETENCIA = "Sem Competência";

/**
 * Extracts a "YYYY-MM" competence bucket from a raw date value found in a
 * spreadsheet cell. Tries ISO (YYYY-MM-DD...), then BR (DD/MM/YYYY), then
 * falls back to native Date parsing. Returns a single unified sentinel
 * (SEM_COMPETENCIA) when nothing works — the old prototype had three
 * different "unknown" sentinels floating around ('Indefinida', 'Sem Data',
 * 'Sem Competência') depending on which code path failed, which made
 * filtering/grouping by competence unreliable.
 */
export function extractCompetence(raw: unknown): string {
  if (raw === null || raw === undefined) return SEM_COMPETENCIA;
  const s = String(raw).trim();
  if (!s) return SEM_COMPETENCIA;

  const iso = s.match(/^(\d{4})-(\d{2})-\d{2}/);
  if (iso) return `${iso[1]}-${iso[2]}`;

  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) {
    const month = br[2].padStart(2, "0");
    return `${br[3]}-${month}`;
  }

  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }

  return SEM_COMPETENCIA;
}
