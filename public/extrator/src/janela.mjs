// Localiza a faixa de NSU que cobre um período, para não ler a caixa inteira.
//
// O ADN não aceita filtro por data: o único acesso é por NSU, um contador
// sequencial. Mas cada item do lote traz `DataHoraGeracao` no METADADO — sem
// precisar descompactar o XML — e essa data cresce junto com o NSU (conferido
// contra um lote real: nenhum documento fora de ordem).
//
// Isso permite uma busca binária pelo NSU onde o período começa. Numa caixa de
// 10 mil documentos, procurar o mês passado passa de ~200 requisições para ~20.
//
// ── O risco, e como ele é tratado ──
// `DataHoraGeracao` é quando o documento chegou ao ambiente nacional, não quando
// a nota foi emitida. Município com sistema próprio transmite depois: no lote
// real, uma nota emitida em 30/04 só chegou em 08/05, oito dias de atraso.
// Pular pela data de geração sem folga arriscaria deixar nota de fora — e
// conferência que perde nota em silêncio é pior que conferência lenta.
//
// Por isso: (1) recuamos uma MARGEM generosa antes de começar; (2) ao terminar,
// CONFERIMOS se o primeiro documento lido é mesmo anterior ao início do período
// — se não for, a margem era curta e a busca é refeita com o dobro dela.

const DIA = 86400000;

/**
 * Quanto esperar antes de aceitar que a caixa acabou.
 *
 * Lote vazio era tratado como fim, ponto final. Mas o ADN responde 200 com lote
 * vazio em dois casos diferentes: a caixa acabou mesmo, ou ele ainda está
 * montando o que falta. Os dois chegam idênticos aqui, e a ferramenta escolhia
 * sempre o primeiro — em silêncio.
 *
 * O efeito é o pior possível para uma conferência: quem acabou de emitir recebe
 * um relatório que PARECE completo e não tem a nota. Nada na tela, nenhum erro,
 * nenhum aviso. E como a leitura sempre termina num lote vazio, isso valia para
 * todas as cargas, não para um caso raro.
 *
 * Agora o fim é confirmado: lote vazio, espera, pergunta de novo. Custa uma
 * requisição por carga. Declarar fim cedo custa uma nota faltando.
 */
const ESPERA_CONFIRMACAO = 3000;

/** Quantos documentos o ADN devolve por lote. */
const LOTE = 50;

/**
 * Quanto ampliar a janela de LEITURA, em dias. Não confundir com o filtro: as notas
 * devolvidas são sempre e só as do período pedido — `considerar()` compara a data da
 * própria nota. A margem existe porque a leitura anda por `DataHoraGeracao`, que é
 * quando o documento chegou ao ambiente nacional.
 *
 * Nunca se recua: a geração é sempre posterior ou igual à emissão, e a emissão
 * posterior ou igual à competência. Começar na data inicial pedida não perde nada.
 *
 * Para a frente é preciso esticar, senão some nota do fim do período: no lote real,
 * uma nota emitida em 30/04 só chegou ao ADN em 08/05. Ler além do período não traz
 * nota de fora — o filtro continua exato — só garante que nada fique para trás.
 */
export const MARGEM = {
  emissao: { antes: 0, depois: 45 },
  competencia: { antes: 0, depois: 45 },
};

const soData = (iso) => (iso || '').slice(0, 10);

function somarDias(dataISO, dias) {
  const d = new Date(`${dataISO}T12:00:00Z`);
  return new Date(d.getTime() + dias * DIA).toISOString().slice(0, 10);
}

const menorGeracao = (docs) => docs.reduce((m, d) => {
  const g = soData(d.DataHoraGeracao);
  return !m || (g && g < m) ? g : m;
}, '');

/** O que a busca binária precisa de um lote — o resto dele não interessa aqui. */
const resumir = (lote) => ({
  fim: Boolean(lote.fim) || lote.documentos.length === 0,
  menorGeracao: menorGeracao(lote.documentos),
});

const maiorNSU = (docs) => docs.reduce((m, d) => Math.max(m, Number(d.NSU) || 0), 0);

/**
 * Acha o maior NSU a partir do qual nada anterior a `alvo` é perdido.
 *
 * Devolve `{ nsu, sondagens }`. `nsu` é o ponto de partida da leitura: o lote
 * buscado a partir dele começa em `alvo` ou depois, e tudo que ficou para trás é
 * comprovadamente mais antigo.
 */
export async function localizarInicio(adn, alvo, { aoStatus = () => {} } = {}) {
  let sondagens = 0;

  // `adn.sondar` guarda o que já sondou nesta sessão; quem não tiver (os testes)
  // cai no caminho direto, com o mesmo resultado.
  const sondar = async (nsu) => {
    sondagens++;
    aoStatus('Localizando notas do período…');
    if (typeof adn.sondar === 'function') return adn.sondar(nsu);
    return resumir(await adn.buscarLote(nsu));
  };

  // 1) Limite superior: dobra o passo até passar do fim da caixa ou do alvo.
  let baixo = 0;
  let alto = null;
  let passo = 512;

  while (alto === null) {
    const lote = await sondar(passo);
    if (lote.fim) {
      alto = passo; // passamos do fim da caixa
      break;
    }
    if (lote.menorGeracao >= alvo) {
      alto = passo; // a partir daqui já estamos dentro (ou depois) do alvo
      break;
    }
    // O piso avança para o NSU SONDADO, nunca para o fim do lote que ele
    // devolveu. A diferença não é cosmética: o lote sondado é justamente o que
    // pode ATRAVESSAR o início do período — seu primeiro documento é anterior a
    // `alvo` (foi o que trouxe a execução até aqui) e os últimos já podem estar
    // dentro dele. Avançar para `maiorNSU` pulava esse lote inteiro, e com ele
    // as PRIMEIRAS notas do período — as únicas que ninguém percebe faltando,
    // porque o relatório continua parecendo completo a partir do segundo dia.
    //
    // A busca binária abaixo não corrigia isso: se a fronteira cai dentro desse
    // lote, todo `meio` sondado depois já começa em `alvo` ou adiante, então o
    // piso nunca mais se mexe e o pulo errado é o que fica.
    //
    // `passo` é seguro pelo mesmo motivo que `meio` é: o lote que começa nele
    // tem documento anterior a `alvo`, logo tudo até `passo` é mais antigo
    // ainda. Só o fim do lote é que não tinha essa garantia.
    baixo = passo;
    if (passo > 4_000_000) {
      alto = passo; // trava de segurança: caixa absurdamente grande
      break;
    }
    passo *= 4;
  }

  // 2) Busca binária pelo menor NSU cujo lote já começa em `alvo` ou depois.
  //    Parar com folga de um lote evita sondagem inútil no fim.
  while (alto - baixo > LOTE) {
    const meio = Math.floor((baixo + alto) / 2);
    const lote = await sondar(meio);

    // Mesma regra do passo 1: o piso é o NSU sondado, não o fim do lote.
    if (lote.fim || lote.menorGeracao >= alvo) {
      alto = meio;
    } else {
      baixo = meio;
    }
  }

  // Um lote de recuo, por uma requisição a mais.
  //
  // Tudo acima se apoia em `DataHoraGeracao` crescer junto com o NSU. Isso vale
  // nos lotes conferidos, mas é promessa do ADN, não deste código — e aqui o
  // preço do erro é assimétrico: ler 50 documentos a mais custa um segundo, e
  // deixar nota de fora custa uma conferência errada que ninguém vê.
  return { nsu: Math.max(0, baixo - LOTE), sondagens };
}

/**
 * Lê os documentos do período, do NSU localizado até passar do fim da janela.
 *
 * `manter(doc)` decide, documento a documento, o que entra — é onde o filtro de
 * emitidas/tomadas e de data é aplicado, ANTES de guardar qualquer coisa.
 *
 * A leitura para ao passar de `limiteFim`. Isso tem uma consequência que precisa
 * ficar dita: eventos que chegam DEPOIS dessa data ficam de fora. Uma nota do
 * período cancelada meses adiante tem o evento lá no fim da caixa e não será vista
 * — ela sai no relatório como normal. A folga embutida em `limiteFim` (45 dias por
 * competência, 60 por emissão) é o que cobre os cancelamentos mais comuns, que
 * acontecem perto da emissão.
 */
export async function lerJanela(
  adn,
  { nsuInicial, limiteFim, manter, aoProgresso = () => {}, esperaConfirmacao = ESPERA_CONFIRMACAO },
) {
  let nsu = nsuInicial;
  let lotes = 0;
  let lidos = 0;
  let mantidos = 0;
  let primeiraGeracao = '';
  let ultimaGeracao = '';

  // O ADN manda avisos junto com o lote, e eles estavam sendo jogados fora aqui.
  // São exatamente o tipo de coisa que explica uma leitura que parece certa e
  // está incompleta — e silêncio, numa conferência, é a pior resposta possível.
  const alertas = new Set();

  /** O que o ADN respondeu no lote vazio que encerrou a leitura. */
  let statusFinal = '';
  let jaConfirmou = false;

  while (true) {
    const lote = await adn.buscarLote(nsu);
    for (const a of lote.alertas ?? []) {
      const texto = [a.Codigo ?? a.codigo, a.Descricao ?? a.descricao].filter(Boolean).join(' — ');
      if (texto) alertas.add(texto);
    }

    if (lote.fim || lote.documentos.length === 0) {
      statusFinal = lote.status ?? '';
      if (jaConfirmou) break;
      jaConfirmou = true;
      if (esperaConfirmacao > 0) await new Promise((r) => setTimeout(r, esperaConfirmacao));
      continue; // pergunta o MESMO NSU de novo, antes de dizer que acabou
    }

    jaConfirmou = false;
    lotes++;
    for (const d of lote.documentos) {
      const g = soData(d.DataHoraGeracao);
      if (g > ultimaGeracao) ultimaGeracao = g;
      lidos++;
      if (!primeiraGeracao && g) primeiraGeracao = g;
      if (manter(d)) mantidos++;
    }

    aoProgresso({ lotes, lidos, mantidos, nsu, ultimaGeracao });

    const novoMax = maiorNSU(lote.documentos);
    if (novoMax <= nsu) break; // não avançou: evita laço infinito
    nsu = novoMax;

    if (limiteFim && menorGeracao(lote.documentos) > limiteFim) break;
  }

  return { lotes, lidos, mantidos, nsu, primeiraGeracao, ultimaGeracao, statusFinal, alertas: [...alertas] };
}

export { somarDias };
