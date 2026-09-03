/**
 * Conversão de texto UTF-8 para **ANSI** — na prática, a página de código
 * Windows-1252, que é o que o Windows historicamente chama de ANSI.
 *
 * Função pura, sem DOM e sem leitura de arquivo, como os outros conversores:
 * recebe texto, devolve bytes. É o que permite testar o mapeamento sem navegador.
 */

/**
 * Faixa 0x80–0x9F: onde Windows-1252 diverge do Latin-1. São os caracteres
 * "de máquina de escrever" — aspas curvas, travessões, reticências — que o Word
 * e os emissores de nota inserem sem avisar, e que só existem aqui.
 */
const CP1252_ESPECIAIS: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
  0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
  0x017e: 0x9e, 0x0178: 0x9f,
};

/** `null` quando o caractere não existe em Windows-1252. */
function byteCp1252(codePoint: number): number | null {
  if (codePoint < 0x80) return codePoint;
  if (codePoint in CP1252_ESPECIAIS) return CP1252_ESPECIAIS[codePoint];
  if (codePoint >= 0xa0 && codePoint <= 0xff) return codePoint;
  return null;
}

/** O que fazer com o caractere que não tem equivalente em ANSI. */
export type SemEquivalente = "interrogacao" | "remover";

export interface ResultadoAnsi {
  bytes: Uint8Array;
  /** Caractere → quantas vezes apareceu sem ter equivalente. */
  naoMapeados: Map<string, number>;
  /** Soma das ocorrências — o número que a tela mostra. */
  totalNaoMapeados: number;
}

export function paraAnsi(texto: string, semEquivalente: SemEquivalente): ResultadoAnsi {
  const bytes: number[] = [];
  const naoMapeados = new Map<string, number>();
  let totalNaoMapeados = 0;

  // `for...of` percorre por **code point**, então emoji e outros pares
  // substitutos contam como um caractere só — iterar por índice partiria o par
  // em dois e reportaria o dobro de perdas.
  for (const caractere of texto) {
    const byte = byteCp1252(caractere.codePointAt(0)!);
    if (byte === null) {
      naoMapeados.set(caractere, (naoMapeados.get(caractere) ?? 0) + 1);
      totalNaoMapeados += 1;
      if (semEquivalente === "interrogacao") bytes.push(0x3f); // "?"
      continue;
    }
    bytes.push(byte);
  }

  return { bytes: Uint8Array.from(bytes), naoMapeados, totalNaoMapeados };
}

export interface TextoDecodificado {
  texto: string;
  origem: "UTF-8" | "Windows-1252";
}

/**
 * Lê os bytes do arquivo tentando **UTF-8 estrito** primeiro. Se falhar, o
 * arquivo já estava em Windows-1252 (ou noutra tabela de byte único) e é lido
 * assim — nesse caso a conversão vira praticamente uma cópia, que é o
 * comportamento correto: reconverter não deve corromper o que já estava certo.
 */
export function decodificar(buffer: ArrayBuffer): TextoDecodificado {
  try {
    return { texto: new TextDecoder("utf-8", { fatal: true }).decode(buffer), origem: "UTF-8" };
  } catch {
    return { texto: new TextDecoder("windows-1252").decode(buffer), origem: "Windows-1252" };
  }
}

/** `RELATORIO.txt` → `RELATORIO_ANSI.txt`. */
export function nomeDeSaida(nomeOriginal: string): string {
  return `${nomeOriginal.replace(/\.txt$/i, "")}_ANSI.txt`;
}
