const f0 = new Intl.NumberFormat("pt-BR");
const f1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const f2 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const int = (v: number) => f0.format(Math.round(v || 0));
export const um = (v: number) => f1.format(v || 0);
export const dois = (v: number) => f2.format(v || 0);
export const pct = (v: number) => (Number.isFinite(v) ? `${f1.format((v || 0) * 100)}%` : "—");
export const pct0 = (v: number) => (Number.isFinite(v) ? `${f0.format(Math.round((v || 0) * 100))}%` : "—");
export const reais = (v: number) => `R$ ${f0.format(Math.round(v || 0))}`;
export function reaisC(v: number): string {
  v = v || 0;
  if (v >= 1e6) return `R$ ${f1.format(v / 1e6)} mi`;
  if (v >= 1e3) return `R$ ${f0.format(Math.round(v / 1e3))} mil`;
  return `R$ ${f0.format(Math.round(v))}`;
}

export const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export function rotuloTri(t: string): string {
  const p = t.split("-T");
  return `${p[1]}º tri ${p[0]}`;
}
export function rotuloTriLongo(t: string): string {
  const p = t.split("-T");
  return `${p[1]}º trimestre de ${p[0]}`;
}
/** `2026-03-15` → `15/03/2026` */
export const dataBr = (iso: string) => iso.split("-").reverse().join("/");
