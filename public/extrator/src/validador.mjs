// Confronta as notas do Emissor Nacional com os lançamentos da contabilidade.
//
// O cruzamento é pelo NÚMERO da nota (coluna `documento_inicial` no arquivo) e,
// achado o par, pelo VALOR (`valor_contabil`).
//
// A regra do cancelamento é o que dá trabalho, e é onde mora o erro que a
// conferência precisa pegar. No lançamento, nota cancelada entra com valor zero.
// Então valor zero não é, por si, divergência: depende do que o Emissor diz.
//
//   arquivo 0,00  +  emissor CANCELADA      → certo, nada a apontar
//   arquivo 0,00  +  emissor NORMAL         → aponta: foi baixada como cancelada
//                                             mas a nota está válida
//   arquivo ≠ 0   +  emissor CANCELADA      → aponta: a nota foi cancelada e o
//                                             lançamento seguiu com valor

import { soNumero } from './importar.mjs';

/** Um centavo de tolerância: valor vem de fontes que arredondam diferente. */
const TOLERANCIA = 0.005;

/**
 * Compara e devolve os apontamentos em três grupos.
 *
 * `naoCancelada` junta as duas direções da divergência de cancelamento — são
 * poucas e a causa é a mesma conversa com o cliente; cada linha traz o motivo.
 */
export function validar(notas, lancamentos) {
  // Um número pode repetir no arquivo (série diferente, relançamento); guardamos
  // todos e depois escolhemos o que mais se aproxima do valor da nota.
  const porDocumento = new Map();
  for (const l of lancamentos) {
    if (!porDocumento.has(l.documento)) porDocumento.set(l.documento, []);
    porDocumento.get(l.documento).push(l);
  }

  const naoLocalizadas = [];
  const valorDivergente = [];
  const naoCancelada = [];
  let conferidas = 0;

  for (const nota of notas) {
    const numero = soNumero(nota.numero);
    const candidatos = porDocumento.get(numero);

    if (!candidatos || candidatos.length === 0) {
      naoLocalizadas.push({ ...nota, motivo: 'Número não encontrado no arquivo de lançamentos' });
      continue;
    }

    // O valor de referência é o da nota cheia — é ele que vira valor contábil.
    const valorNota = nota.valorServico || nota.valorLiquido || 0;
    const lancado = candidatos.reduce((melhor, c) =>
      Math.abs(c.valor - valorNota) < Math.abs(melhor.valor - valorNota) ? c : melhor
    );

    const cancelada = nota.situacao !== 'NORMAL';
    const lancadoZerado = Math.abs(lancado.valor) < TOLERANCIA;

    if (lancadoZerado && cancelada) {
      conferidas++; // cancelada dos dois lados: exatamente o esperado
      continue;
    }

    if (lancadoZerado && !cancelada) {
      naoCancelada.push({
        ...nota,
        valorLancado: lancado.valor,
        motivo: 'Lançada com valor zero, mas a nota não está cancelada no Emissor',
      });
      continue;
    }

    if (!lancadoZerado && cancelada) {
      naoCancelada.push({
        ...nota,
        valorLancado: lancado.valor,
        motivo: `Cancelada no Emissor, mas lançada com valor`,
      });
      continue;
    }

    if (Math.abs(lancado.valor - valorNota) >= TOLERANCIA) {
      valorDivergente.push({
        ...nota,
        valorLancado: lancado.valor,
        diferenca: Math.round((valorNota - lancado.valor) * 100) / 100,
        motivo: 'Valor do lançamento diferente do valor da nota',
      });
      continue;
    }

    conferidas++;
  }

  return {
    conferidas,
    grupos: [
      {
        id: 'naoLocalizadas',
        titulo: 'Notas não localizadas no lançamento',
        descricao: 'O número da nota não aparece no arquivo importado.',
        notas: naoLocalizadas,
      },
      {
        id: 'valorDivergente',
        titulo: 'Notas com valor divergente',
        descricao: 'O número foi encontrado, mas o valor lançado não bate com o da nota.',
        notas: valorDivergente,
      },
      {
        id: 'naoCancelada',
        titulo: 'Notas com divergência de cancelamento',
        descricao: 'O cancelamento não bate entre o Emissor e o lançamento.',
        notas: naoCancelada,
      },
    ],
    totalApontado: naoLocalizadas.length + valorDivergente.length + naoCancelada.length,
  };
}
