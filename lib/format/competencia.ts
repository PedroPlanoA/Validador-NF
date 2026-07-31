const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/** "2026-07" -> "Julho/2026". Anything that doesn't match YYYY-MM (e.g. the
 *  "Sem Competência" sentinel) is returned unchanged. */
export function formatCompetencia(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) return value;
  const [, year, month] = match;
  const monthName = MESES[Number(month) - 1];
  if (!monthName) return value;
  return `${monthName}/${year}`;
}

/** "2026-T2" -> "2º trimestre/2026". Qualquer outro formato volta intacto. */
export function formatTrimestre(value: string): string {
  const match = value.match(/^(\d{4})-T([1-4])$/);
  if (!match) return value;
  const [, year, quarter] = match;
  return `${quarter}º trimestre/${year}`;
}
