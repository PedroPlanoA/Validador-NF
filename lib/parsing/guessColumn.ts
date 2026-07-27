const COMBINING_DIACRITICS = /[̀-ͯ]/g;

function normalizeToken(s: string): string {
  return s
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Keyword hints per internal field, used to auto-guess which spreadsheet
 *  column maps to it. Order matters: earlier keywords are preferred. */
const FIELD_KEYWORDS: Record<string, string[]> = {
  codigoVenda: ["codigovenda", "codigopedido", "codigo", "pedido", "transacao", "order", "orderid"],
  comprador: ["comprador", "cliente", "customer", "buyer", "nome"],
  valorBase: ["valorvenda", "valorbruto", "valortotal", "valor", "preco", "price", "total"],
  situacaoVenda: ["situacaovenda", "statusvenda", "situacao", "status"],
  dataVenda: ["datavenda", "data", "date"],
  valorRecebido: ["valorrecebido", "recebido", "received"],
  valorLiquido: ["valorliquido", "liquido", "net", "netamount"],
  situacaoNf: ["situacaonf", "statusnf", "situacao", "status"],
  competencia: ["competencia", "mesreferencia", "dataemissao", "emissao", "mes", "data"],
  valorNf: ["valornf", "valorfaturado", "valortotal", "valor", "total"],
  numero: ["numeronf", "numero", "number", "nf"],
  tipo: ["tiponf", "tipo", "type"],
  codigoServico: ["codigoservico", "servico", "service"],
};

/** Guesses the best-matching spreadsheet header for an internal field name. */
export function guessColumn(field: string, headers: string[]): string | undefined {
  const keywords = FIELD_KEYWORDS[field] ?? [normalizeToken(field)];
  const normalizedHeaders = headers.map((h) => ({ original: h, norm: normalizeToken(h) }));

  for (const keyword of keywords) {
    const exact = normalizedHeaders.find((h) => h.norm === keyword);
    if (exact) return exact.original;
  }
  for (const keyword of keywords) {
    const partial = normalizedHeaders.find((h) => h.norm.includes(keyword));
    if (partial) return partial.original;
  }
  return undefined;
}
