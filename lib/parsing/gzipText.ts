"use client";

/** Cabeçalho que avisa o servidor que o corpo veio comprimido. Deliberadamente
 *  **não** é `Content-Encoding`: esse é interpretado por proxies e pela própria
 *  plataforma, e queremos que os bytes cheguem exatamente como saíram, para
 *  descomprimir de forma explícita do outro lado. */
export const BODY_ENCODING_HEADER = "x-body-encoding";

/**
 * Comprime o CSV com gzip no navegador via `CompressionStream`. CSV de
 * relatório fiscal é altamente repetitivo (mesma plataforma, mesmo produto,
 * datas parecidas), então costuma reduzir de 6 a 10 vezes — é o que faz um
 * relatório grande caber no limite de corpo de requisição da plataforma.
 *
 * `CompressionStream` existe em todos os navegadores atuais; onde faltar, o
 * texto vai sem compressão e o servidor aceita as duas formas.
 */
export async function gzipText(text: string): Promise<{ body: BodyInit; encoding: "gzip" | "identity" }> {
  const bytes = new TextEncoder().encode(text);

  if (typeof CompressionStream === "undefined") {
    return { body: bytes as unknown as BodyInit, encoding: "identity" };
  }

  const stream = new Blob([bytes as unknown as BlobPart]).stream().pipeThrough(new CompressionStream("gzip"));
  const compressed = await new Response(stream).arrayBuffer();
  return { body: compressed, encoding: "gzip" };
}
