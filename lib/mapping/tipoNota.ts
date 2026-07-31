/**
 * Reconhece nota de devolução pelo `tipo`.
 *
 * O campo é texto livre do relatório do emissor, e cada emissor escreve à sua
 * maneira: "NF-e Devolução", "Devolução", "Nota de devolução", "Devolucao".
 * Comparar pelo radical **devolu** pega todas as variações, com ou sem acento e
 * em qualquer caixa — proposital, é mais seguro do que uma lista fechada de
 * nomes que quebraria no primeiro emissor novo.
 */
export function isDevolucao(tipo: string): boolean {
  return tipo.toLowerCase().includes("devolu");
}
