import { modeloDaNota, type ModeloNota } from "@/lib/split/modeloNota";

/** Nota mínima que a análise precisa. Prisma satisfaz estruturalmente. */
export interface NotaParaSplit {
  codigoVendaNormalized: string;
  tipo: string;
  valorNf: number;
  competencia: string;
}

export interface SplitTotals {
  receita: number;
  nfe: number;
  nfse: number;
}

export interface PeriodoSplit extends SplitTotals {
  chave: string;
  vendas: number;
  /** Média simples do % NF-e das vendas que dividem, no período. */
  mediaPorVenda: number | null;
  /** Ponderada, restrita aos produtos que dividem a venda. */
  ponderadaQuemDivide: number | null;
  notasNfe: number;
}

export interface ProdutoSplit extends SplitTotals {
  produto: string;
  vendas: number;
  /** Média simples do % NF-e nas vendas deste produto que dividem. */
  mediaPorVenda: number | null;
  divide: boolean;
}

export interface SplitResult {
  totais: SplitTotals;
  vendas: number;
  notasNfe: number;
  notasNfse: number;
  /** Vendas com os **dois** modelos na mesma venda. */
  vendasComDoisModelos: number;
  ticketMedio: number;
  /** Ponderada sobre todo o faturamento. */
  ponderadaGeral: number | null;
  /** Ponderada só sobre a receita dos produtos que dividem a venda. */
  ponderadaQuemDivide: number | null;
  /** Média simples por venda que divide — cada venda pesa igual. */
  mediaPorVenda: number | null;
  competencias: PeriodoSplit[];
  trimestres: PeriodoSplit[];
  produtos: ProdutoSplit[];
  produtosQueDividem: string[];
  /** Notas fora da análise (devolução e tipos não classificáveis). */
  excluidas: { tipo: string; quantidade: number; valor: number }[];
}

const PRODUTO_DESCONHECIDO = "Produto Não Identificado";

/** "2026-05" → "2026-T2" */
export function trimestreDe(competencia: string): string {
  const [ano, mes] = competencia.split("-");
  const m = Number(mes);
  if (!ano || !m) return competencia;
  return `${ano}-T${Math.ceil(m / 3)}`;
}

interface Acc extends SplitTotals {
  vendas: Set<string>;
  somaPct: number;
  qtdPct: number;
  notasNfe: number;
  /** Receita e NF-e restritas aos produtos que dividem — para a ponderada. */
  baseQuemDivide: number;
  nfeQuemDivide: number;
}

function novoAcc(): Acc {
  return {
    receita: 0,
    nfe: 0,
    nfse: 0,
    vendas: new Set(),
    somaPct: 0,
    qtdPct: 0,
    notasNfe: 0,
    baseQuemDivide: 0,
    nfeQuemDivide: 0,
  };
}

function fração(parte: number, total: number): number | null {
  return total > 0 ? parte / total : null;
}

/**
 * Análise de split NF-e × NFS-e — função pura, sem acesso a banco.
 *
 * Regras, herdadas do relatório que o usuário já usava:
 *  - **Receita** é a soma do valor das notas, não o valor da venda na
 *    plataforma. A pergunta aqui é fiscal: quanto saiu em cada modelo de nota.
 *  - O **valor da venda** é a soma das notas que compartilham o mesmo código —
 *    numa venda dividida, NF-e + NFS-e. Por isso `% NF-e da venda` = NF-e ÷ soma.
 *  - Um produto **divide** quando tem qualquer NF-e no período. As duas
 *    ponderadas existem porque a resposta muda muito: sobre todo o faturamento a
 *    NF-e dilui, e sobre só quem divide ela mostra a regra real de rateio.
 *  - **Devolução e tipos não classificáveis ficam fora** das porcentagens e são
 *    devolvidos em `excluidas`, para aparecerem na tela em vez de desaparecerem.
 *
 * `produtoPorCodigo` vem do relatório de vendas: a nota fiscal não tem produto.
 * Sem o relatório de vendas importado, tudo cai em "Produto Não Identificado" —
 * explícito, e não um rateio inventado.
 */
export function computeSplit(
  notas: NotaParaSplit[],
  produtoPorCodigo: Map<string, string>,
): SplitResult {
  const excluidas = new Map<string, { quantidade: number; valor: number }>();
  const porVenda = new Map<string, { nfe: number; nfse: number; produto: string; competencia: string }>();
  const geral = novoAcc();
  const porCompetencia = new Map<string, Acc>();
  const porTrimestre = new Map<string, Acc>();
  const porProduto = new Map<string, Acc>();

  const incluidas: { nota: NotaParaSplit; modelo: Exclude<ModeloNota, "OUTRO">; produto: string }[] = [];

  for (const nota of notas) {
    const modelo = modeloDaNota(nota.tipo);
    if (modelo === "OUTRO") {
      const atual = excluidas.get(nota.tipo) ?? { quantidade: 0, valor: 0 };
      atual.quantidade += 1;
      atual.valor += nota.valorNf;
      excluidas.set(nota.tipo, atual);
      continue;
    }

    const produto = produtoPorCodigo.get(nota.codigoVendaNormalized) ?? PRODUTO_DESCONHECIDO;
    incluidas.push({ nota, modelo, produto });

    const venda =
      porVenda.get(nota.codigoVendaNormalized) ??
      { nfe: 0, nfse: 0, produto, competencia: nota.competencia };
    if (modelo === "PRODUTO") venda.nfe += nota.valorNf;
    else venda.nfse += nota.valorNf;
    porVenda.set(nota.codigoVendaNormalized, venda);
  }

  // Produtos que dividem: têm ao menos uma NF-e. Precisa ser resolvido antes das
  // ponderadas "só quem divide", que dependem desse conjunto.
  const receitaNfePorProduto = new Map<string, number>();
  for (const { nota, modelo, produto } of incluidas) {
    if (modelo !== "PRODUTO") continue;
    receitaNfePorProduto.set(produto, (receitaNfePorProduto.get(produto) ?? 0) + nota.valorNf);
  }
  const produtosQueDividem = new Set(receitaNfePorProduto.keys());

  const somar = (acc: Acc, valor: number, modelo: Exclude<ModeloNota, "OUTRO">, codigo: string, divide: boolean) => {
    acc.receita += valor;
    if (modelo === "PRODUTO") {
      acc.nfe += valor;
      acc.notasNfe += 1;
    } else {
      acc.nfse += valor;
    }
    acc.vendas.add(codigo);
    if (divide) {
      acc.baseQuemDivide += valor;
      if (modelo === "PRODUTO") acc.nfeQuemDivide += valor;
    }
  };

  for (const { nota, modelo, produto } of incluidas) {
    const divide = produtosQueDividem.has(produto);
    const trimestre = trimestreDe(nota.competencia);

    somar(geral, nota.valorNf, modelo, nota.codigoVendaNormalized, divide);

    for (const [mapa, chave] of [
      [porCompetencia, nota.competencia],
      [porTrimestre, trimestre],
      [porProduto, produto],
    ] as const) {
      const acc = mapa.get(chave) ?? novoAcc();
      somar(acc, nota.valorNf, modelo, nota.codigoVendaNormalized, divide);
      mapa.set(chave, acc);
    }
  }

  // Média simples: uma entrada por VENDA que tem os dois modelos, para que uma
  // venda com duas NF-e não pese dobrado (o relatório original contava por nota).
  let vendasComDoisModelos = 0;
  for (const venda of porVenda.values()) {
    if (venda.nfe <= 0 || venda.nfse <= 0) continue;
    vendasComDoisModelos += 1;
    const pct = venda.nfe / (venda.nfe + venda.nfse);
    geral.somaPct += pct;
    geral.qtdPct += 1;

    for (const [mapa, chave] of [
      [porCompetencia, venda.competencia],
      [porTrimestre, trimestreDe(venda.competencia)],
      [porProduto, venda.produto],
    ] as const) {
      const acc = mapa.get(chave);
      if (!acc) continue;
      acc.somaPct += pct;
      acc.qtdPct += 1;
    }
  }

  const periodo = (chave: string, acc: Acc): PeriodoSplit => ({
    chave,
    receita: acc.receita,
    nfe: acc.nfe,
    nfse: acc.nfse,
    vendas: acc.vendas.size,
    mediaPorVenda: fração(acc.somaPct, acc.qtdPct),
    ponderadaQuemDivide: fração(acc.nfeQuemDivide, acc.baseQuemDivide),
    notasNfe: acc.notasNfe,
  });

  return {
    totais: { receita: geral.receita, nfe: geral.nfe, nfse: geral.nfse },
    vendas: geral.vendas.size,
    notasNfe: incluidas.filter((i) => i.modelo === "PRODUTO").length,
    notasNfse: incluidas.filter((i) => i.modelo === "SERVICO").length,
    vendasComDoisModelos,
    ticketMedio: geral.vendas.size > 0 ? geral.receita / geral.vendas.size : 0,
    ponderadaGeral: fração(geral.nfe, geral.receita),
    ponderadaQuemDivide: fração(geral.nfeQuemDivide, geral.baseQuemDivide),
    mediaPorVenda: fração(geral.somaPct, geral.qtdPct),
    competencias: [...porCompetencia.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => periodo(k, v)),
    trimestres: [...porTrimestre.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => periodo(k, v)),
    produtos: [...porProduto.entries()]
      .map(([produto, acc]) => ({
        produto,
        receita: acc.receita,
        nfe: acc.nfe,
        nfse: acc.nfse,
        vendas: acc.vendas.size,
        mediaPorVenda: fração(acc.somaPct, acc.qtdPct),
        divide: produtosQueDividem.has(produto),
      }))
      .sort((a, b) => b.receita - a.receita),
    produtosQueDividem: [...produtosQueDividem].sort(),
    excluidas: [...excluidas.entries()]
      .map(([tipo, v]) => ({ tipo, ...v }))
      .sort((a, b) => b.quantidade - a.quantidade),
  };
}
