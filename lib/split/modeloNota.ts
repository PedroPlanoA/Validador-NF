import { isDevolucao } from "@/lib/mapping/tipoNota";

/**
 * Modelo fiscal da nota, para a análise de split.
 *
 * - `SERVICO` — NFS-e: o curso/serviço.
 * - `PRODUTO` — NF-e: o e-book/livro, a parte da venda que sai como mercadoria.
 * - `OUTRO` — devolução (não é faturamento) e qualquer tipo que não dá para
 *   classificar com segurança, como "NF Indefinida". Fica **fora** das
 *   porcentagens e é reportado à parte, para não inflar nem sumir do total.
 */
export type ModeloNota = "PRODUTO" | "SERVICO" | "OUTRO";

/** `tipo` é texto livre do emissor, então a comparação é por radical, como em
 *  `isDevolucao`. "nfs" pega NFS-e, NFSe, NFS; depois disso, o que sobrar com
 *  "nfe"/"nf-e" é NF-e. O resto vira OUTRO de propósito — chutar seria pior. */
export function modeloDaNota(tipo: string): ModeloNota {
  if (isDevolucao(tipo)) return "OUTRO";
  const t = tipo.toLowerCase();
  if (t.includes("nfs")) return "SERVICO";
  if (t.includes("nfe") || t.includes("nf-e")) return "PRODUTO";
  return "OUTRO";
}

export const MODELO_LABELS: Record<Exclude<ModeloNota, "OUTRO">, string> = {
  PRODUTO: "NF-e",
  SERVICO: "NFS-e",
};
