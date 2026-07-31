/** Fração (0–1) como porcentagem em pt-BR, uma decimal — o formato do relatório
 *  de origem. `null` vira travessão: "0,0%" mentiria sobre a ausência de base. */
export function formatPercent(fracao: number | null | undefined): string {
  if (fracao === null || fracao === undefined) return "—";
  return `${(100 * fracao).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}
