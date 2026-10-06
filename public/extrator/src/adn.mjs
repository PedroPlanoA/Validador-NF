// Cliente da API oficial ADN (Ambiente de Dados Nacional) de NFS-e.
//
// A autenticação é mTLS: o certificado é apresentado na própria negociação TLS.
// Quem apresenta é o **Schannel**, a pilha TLS do Windows, usando o certificado
// que está no repositório da máquina. A chave privada não passa por este código,
// não é lida, não é copiada, e não existe .pfx nem senha em lugar nenhum do
// projeto — a mesma garantia de antes, por um caminho mais curto.
//
// Antes quem apresentava era o Chrome, dirigido pelo Playwright. O Chrome
// precisava ficar aberto o tempo todo (as chamadas saíam de dentro da página, por
// causa de CORS), não podia ser fechado, e precisava existir na máquina. Nada
// disso é necessário: quem faz a chamada é este processo, então não há página,
// não há origem cruzada e não há navegador.
//
// O certificado escolhido vive **só em memória**, nesta sessão. Não é gravado em
// lugar nenhum: cada conexão exige uma pessoa escolhendo de novo, que é a
// garantia de que nenhuma leitura acontece sem alguém presente.

import { execFile } from 'node:child_process';
import { acharCertificado } from './certificados.mjs';

const ORIGEM = 'https://adn.nfse.gov.br';
const caminhoLote = (nsu) => `/contribuintes/DFe/${nsu}?lote=true`;

// Espaçamento entre chamadas. O ADN responde 429 se apertar; 600ms foi o valor
// que se mostrou estável, com freio adaptativo quando ele reclama.
const RITMO_INICIAL = 600;
const RITMO_MAXIMO = 5000;

/**
 * Quantas respostas boas seguidas soltam o freio um pouco.
 *
 * O freio só subia. Bastava um 429 no começo — e ele vem em rajada, levando o
 * ritmo de 600 ms a 5 s em seis respostas — para a sessão INTEIRA andar oito
 * vezes mais devagar, até fechar o extrator. Numa carga de 30 requisições isso é
 * a diferença entre meio minuto e dois minutos e meio, sem nada na tela
 * explicando, e sem nunca melhorar por conta própria.
 *
 * Agora ele volta: a cada 8 respostas boas seguidas, afrouxa 20%, nunca abaixo
 * do ritmo inicial. Sobe rápido quando o ADN reclama e desce devagar quando ele
 * para de reclamar, que é a ordem certa das duas pressas.
 */
const RITMO_ALIVIO_A_CADA = 8;
const RITMO_ALIVIO_FATOR = 0.8;

const TRANSITORIOS = new Set([429, 502, 503, 504]);

/** Um lote de 50 notas passa de 300 KB; caixas grandes podem ir além. */
const LIMITE_RESPOSTA = 64 * 1024 * 1024;
const TIMEOUT_S = 120;

/** O certificado deixou de servir no meio da leitura. */
export class ConexaoPerdida extends Error {
  constructor(motivo) {
    super(`${motivo} Conecte o certificado de novo para continuar.`);
    this.name = 'ConexaoPerdida';
    this.reconectar = true;
  }
}

export class SessaoAdn {
  #certificado = null;
  #ritmo = RITMO_INICIAL;
  #ultimaChamada = 0;
  #seguidasOk = 0;

  /** Resumo das sondagens já feitas: NSU → { fim, menorGeracao }. Ver `sondar`. */
  #sondagens = new Map();

  #medidas = { chamadas: 0, msRede: 0, msEspera: 0, sondagensPoupadas: 0 };

  /** Para a tela poder dizer onde o tempo foi. Zera a cada conexão. */
  get medidas() {
    return { ...this.#medidas, ritmo: this.#ritmo };
  }

  get conectada() {
    return this.#certificado !== null;
  }

  /** O certificado em uso, para a tela dizer com qual está falando. */
  get certificado() {
    return this.#certificado;
  }

  /**
   * Conecta com o certificado escolhido e devolve o primeiro lote.
   *
   * A primeira chamada é a prova: se o ADN aceitar, o certificado serve. Não há
   * como validar isso sem falar com ele — certificado válido e dentro do prazo
   * ainda pode não estar habilitado à distribuição.
   */
  async conectar({ thumbprint, aoStatus = () => {} } = {}) {
    aoStatus('Conferindo o certificado…');

    const certificado = await acharCertificado(thumbprint);
    if (!certificado) {
      throw new Error('Certificado não encontrado no repositório do Windows. Atualize a lista e escolha de novo.');
    }
    if (certificado.vencido) {
      throw new Error(
        `O certificado de ${certificado.nome} venceu em ${formatarData(certificado.ate)}. ` +
          'Escolha um certificado dentro do prazo.',
      );
    }
    if (!certificado.valido) {
      throw new Error(
        `O certificado de ${certificado.nome} só passa a valer em ${formatarData(certificado.de)}.`,
      );
    }

    this.#certificado = certificado;
    this.#sondagens.clear();
    this.#medidas = { chamadas: 0, msRede: 0, msEspera: 0, sondagensPoupadas: 0 };
    this.#ritmo = RITMO_INICIAL;
    this.#seguidasOk = 0;
    aoStatus('Falando com o ADN…');

    try {
      return await this.buscarLote(0);
    } catch (err) {
      this.#certificado = null;
      throw err;
    }
  }

  async buscarLote(nsu) {
    if (!this.#certificado) throw new Error('Certificado não conectado.');

    for (let tentativa = 0; tentativa < 5; tentativa++) {
      // A espera conta a partir do ENVIO da chamada anterior, não da resposta
      // dela. Contando da resposta, o espaçamento real era `ritmo` MAIS o tempo
      // da chamada: 600 ms de freio viravam 1,1 s entre requisições, e metade do
      // atraso era invisível porque ninguém somava as duas parcelas. O
      // espaçamento pedido ao ADN continua sendo exatamente `ritmo`.
      const desde = Date.now() - this.#ultimaChamada;
      if (desde < this.#ritmo) {
        const espera = this.#ritmo - desde;
        this.#medidas.msEspera += espera;
        await new Promise((r) => setTimeout(r, espera));
      }

      this.#ultimaChamada = Date.now();
      const comecou = Date.now();
      const r = await this.#chamar(caminhoLote(nsu));
      this.#medidas.msRede += Date.now() - comecou;
      this.#medidas.chamadas++;

      // 404 = não há mais nada depois desse NSU. Fim normal da caixa, não erro.
      if (r.status === 404) return { fim: true, documentos: [] };

      if (TRANSITORIOS.has(r.status)) {
        this.#seguidasOk = 0;
        if (r.status === 429) this.#ritmo = Math.min(RITMO_MAXIMO, Math.round(this.#ritmo * 1.5));
        await new Promise((res) => setTimeout(res, Math.min(8000, 2000 * 2 ** tentativa)));
        continue;
      }

      if (r.status === 0) {
        if (tentativa < 4) {
          await new Promise((res) => setTimeout(res, 1500 * (tentativa + 1)));
          continue;
        }
        throw new Error(`Falha de rede ao falar com o ADN: ${r.erro}`);
      }

      // O ADN recusa o certificado no meio da leitura quando ele é revogado ou
      // perde a habilitação. Não adianta repetir: precisa escolher outro.
      if (r.status === 401 || r.status === 403) {
        this.#certificado = null;
        throw new ConexaoPerdida(`O ADN recusou o certificado (HTTP ${r.status}).`);
      }

      if (r.status !== 200) {
        throw new Error(`ADN respondeu HTTP ${r.status}: ${descreverErro(r.texto)}`);
      }

      // Resposta boa: solta o freio de a pouco, se ele tiver subido.
      if (++this.#seguidasOk >= RITMO_ALIVIO_A_CADA && this.#ritmo > RITMO_INICIAL) {
        this.#ritmo = Math.max(RITMO_INICIAL, Math.round(this.#ritmo * RITMO_ALIVIO_FATOR));
        this.#seguidasOk = 0;
      }

      let dados;
      try {
        dados = JSON.parse(r.texto);
      } catch {
        throw new Error('O ADN respondeu algo que não é JSON.');
      }

      return {
        fim: (dados.LoteDFe ?? []).length === 0,
        status: dados.StatusProcessamento,
        documentos: dados.LoteDFe ?? [],
        alertas: dados.Alertas ?? [],
      };
    }

    throw new Error('O ADN está limitando as requisições (429). Tente de novo em alguns minutos.');
  }

  /**
   * Sonda um NSU e devolve só o que a busca binária precisa saber dele.
   *
   * Guarda o resultado porque a mesma sessão sonda os MESMOS NSU várias vezes:
   * trocar o mês e carregar de novo — que é o que mais se faz aqui — refaz a
   * busca inteira do zero, e metade dos pontos sondados costuma ser a mesma.
   * Cada sondagem repetida custava um lote inteiro na rede para devolver uma
   * data que já se sabia.
   *
   * Guardar é seguro na direção que importa. A data de um documento que já
   * existe não muda. E o que PODE mudar — uma caixa que acabava num NSU e
   * passou a ter documento novo depois dele — só faz a busca começar antes do
   * necessário, lendo um pouco mais. Nunca menos.
   */
  async sondar(nsu) {
    const guardado = this.#sondagens.get(nsu);
    if (guardado) {
      this.#medidas.sondagensPoupadas++;
      return guardado;
    }

    const lote = await this.buscarLote(nsu);
    const resumo = {
      fim: Boolean(lote.fim) || lote.documentos.length === 0,
      menorGeracao: lote.documentos.reduce((m, d) => {
        const g = (d.DataHoraGeracao || '').slice(0, 10);
        return !m || (g && g < m) ? g : m;
      }, ''),
    };
    this.#sondagens.set(nsu, resumo);
    return resumo;
  }

  /**
   * Uma chamada, pelo curl do Windows.
   *
   * É o curl e não o `fetch` do Node porque só ele alcança o repositório de
   * certificados: o Node fala TLS por OpenSSL, que não enxerga o armazenamento do
   * Windows e exigiria a chave exportada em arquivo — exatamente o que este
   * projeto não faz. O curl que vem no Windows é compilado com **Schannel**, e
   * referencia o certificado pela impressão digital.
   *
   * A resposta fica **em memória**: nada de `-o arquivo`, porque o lote traz os
   * XMLs das notas e gravá-los em disco contraria a premissa da ferramenta.
   */
  #chamar(caminho) {
    const alvo = `${ORIGEM}${caminho}`;
    const loja = `${this.#certificado.origem}\\MY\\${this.#certificado.thumbprint}`;

    return new Promise((resolve) => {
      execFile(
        'curl.exe',
        [
          '-s',
          '--max-time', String(TIMEOUT_S),
          '--cert', loja,
          // O lote é JSON com os XMLs em base64 — texto puro, que comprime à
          // volta de um quarto do tamanho. Se o ADN não souber comprimir, o
          // curl recebe como antes e nada muda.
          '--compressed',
          // O código HTTP na última linha: o corpo pode ter quebras de linha, e
          // a última é sempre o que o curl acrescentou aqui.
          '-w', '\n%{http_code}',
          alvo,
        ],
        { maxBuffer: LIMITE_RESPOSTA, windowsHide: true, encoding: 'utf8' },
        (erro, stdout, stderr) => {
          if (erro && !stdout) {
            resolve({ status: 0, texto: '', erro: (stderr || erro.message).trim() });
            return;
          }
          const corte = stdout.lastIndexOf('\n');
          const status = Number(stdout.slice(corte + 1).trim()) || 0;
          resolve({ status, texto: stdout.slice(0, corte), erro: '' });
        },
      );
    });
  }

  /** Esquece o certificado. Sem navegador para fechar, é só soltar a escolha. */
  async fechar() {
    this.#certificado = null;
    this.#sondagens.clear();
  }
}

const formatarData = (iso) => (iso || '').split('-').reverse().join('/');

/** O ADN devolve erros em { Erros: [ { Codigo, Descricao } ] }, com chaves capitalizadas. */
function descreverErro(texto) {
  try {
    const j = JSON.parse(texto);
    const lista = j.Erros ?? j.erros ?? [];
    const msg = lista
      .map((e) => [e.Codigo ?? e.codigo, e.Descricao ?? e.descricao].filter(Boolean).join(' — '))
      .filter(Boolean)
      .join('; ');
    return msg || texto.slice(0, 200);
  } catch {
    return texto.slice(0, 200);
  }
}
