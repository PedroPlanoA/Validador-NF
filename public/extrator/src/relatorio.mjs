// Filtro do período e totais do relatório.

/**
 * Filtra as notas do índice.
 *
 * `base` decide qual data manda: 'emissao' é o que bate com a listagem do portal;
 * 'competencia' é o que costuma bater com o faturamento contabilizado. As duas
 * divergem sempre que a nota é emitida num mês e tem competência de outro, e é
 * exatamente nesse ponto que a conferência costuma acusar diferença — por isso a
 * escolha fica visível na tela, em vez de fixa no código.
 */
export function filtrar(notas, { tipo = 'EMITIDA', de = '', ate = '', base = 'emissao', incluirCanceladas = true } = {}) {
  const campo = base === 'competencia' ? 'competencia' : 'dataEmissao';

  return notas.filter((n) => {
    if (tipo !== 'TODAS' && n.tipo !== tipo) return false;
    if (!incluirCanceladas && n.situacao !== 'NORMAL') return false;

    const data = n[campo];
    if (!data) return false;
    if (de && data < de) return false;
    if (ate && data > ate) return false;
    return true;
  });
}

/**
 * Totais do período. Canceladas e substituídas ficam FORA do total que vale para
 * o faturamento, mas continuam contadas à parte — a conferência precisa saber
 * que elas existem, senão some nota do relatório sem explicação.
 */
export function resumir(notas) {
  const validas = notas.filter((n) => n.situacao === 'NORMAL');

  // Arredonda a cada soma: sem isso, 180891.70 vira 180891.69999999995 e a
  // planilha guarda um valor que não bate no centavo com o que o contador soma.
  const somar = (lista, campo) =>
    Math.round(lista.reduce((t, n) => t + (n[campo] || 0), 0) * 100) / 100;

  return {
    quantidade: notas.length,
    quantidadeValidas: validas.length,
    quantidadeCanceladas: notas.filter((n) => n.situacao === 'CANCELADA').length,
    quantidadeSubstituidas: notas.filter((n) => n.situacao === 'SUBSTITUIDA').length,

    // `valorServicos` é o bruto, antes de qualquer retenção — é ele que costuma
    // bater com o faturamento lançado. `valorLiquido` é o que a empresa recebeu.
    valorServicos: somar(validas, 'valorServico'),
    valorLiquido: somar(validas, 'valorLiquido'),
    valorISSQN: somar(validas, 'valorISSQN'),

    valorRetencoes: somar(validas, 'totalRetencoes'),
    valorISSRetido: somar(validas, 'issRetidoValor'),
    valorIRRF: somar(validas, 'valorIRRF'),
    valorCSRF: somar(validas, 'valorCSRF'),
    valorCP: somar(validas, 'valorCP'),

    valorCancelado: somar(
      notas.filter((n) => n.situacao !== 'NORMAL'),
      'valorLiquido'
    ),

    quantidadeCompetenciaDivergente: notas.filter(competenciaDivergente).length,
  };
}

/** O mês de competência é diferente do mês em que a nota foi emitida? */
export const competenciaDivergente = (n) => {
  const mesEmissao = (n.dataEmissao || '').slice(0, 7);
  const mesCompetencia = (n.competencia || '').slice(0, 7);
  return Boolean(mesEmissao && mesCompetencia && mesEmissao !== mesCompetencia);
};

/**
 * Separa as notas cuja competência cai em outro mês.
 *
 * É o ponto onde a conferência por data de emissão costuma divergir do
 * faturamento lançado: a nota sai em agosto com competência de julho, entra no
 * relatório de agosto e no lançamento de julho. Ver separadas evita a caça ao
 * centavo depois.
 */
export function separarPorCompetencia(notas) {
  const divergentes = [];
  const mesmoMes = [];
  for (const n of notas) (competenciaDivergente(n) ? divergentes : mesmoMes).push(n);
  return { divergentes, mesmoMes };
}

/** Quebra por competência — serve para bater mês a mês com o que foi lançado. */
export function porCompetencia(notas) {
  const mapa = new Map();
  for (const n of notas) {
    const mes = (n.competencia || n.dataEmissao || '').slice(0, 7);
    if (!mes) continue;
    if (!mapa.has(mes)) mapa.set(mes, { competencia: mes, quantidade: 0, valor: 0, canceladas: 0 });
    const linha = mapa.get(mes);
    linha.quantidade++;
    if (n.situacao === 'NORMAL') linha.valor += n.valorLiquido || 0;
    else linha.canceladas++;
  }
  for (const linha of mapa.values()) linha.valor = Math.round(linha.valor * 100) / 100;
  return [...mapa.values()].sort((a, b) => a.competencia.localeCompare(b.competencia));
}
