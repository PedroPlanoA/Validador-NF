// Servidor local da ferramenta. Só escuta em 127.0.0.1 — nada disto vai para a rede.
//
// Não há banco nem pasta de dados: os documentos vivem na memória deste processo
// enquanto o certificado estiver conectado, e somem quando você troca de
// certificado ou fecha o servidor.
//
// Fluxo: conectar certificado → escolher filtros → carregar só o período pedido.

import http from 'node:http';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { SessaoAdn } from './src/adn.mjs';
import { listarCertificados } from './src/certificados.mjs';
import { SessaoEmpresa } from './src/sessao.mjs';
import { localizarInicio, lerJanela, somarDias, MARGEM } from './src/janela.mjs';
import { filtrar, resumir } from './src/relatorio.mjs';
import { gerarExcel } from './src/excel.mjs';
import { lerLancamentos } from './src/importar.mjs';
import { validar } from './src/validador.mjs';
import { atualizar, voltarAtras, marcarRuim } from './src/atualizador.mjs';
import JSZip from 'jszip';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(RAIZ, 'web');
const PORTA = Number(process.env.PORTA) || 3777;

/**
 * A versão do agente, lida do package.json.
 *
 * Ela vai para a tela e para o aceno ao HUB Fiscal. Com a ferramenta instalada na
 * máquina de várias pessoas, passam a existir várias cópias e nenhuma forma de
 * saber quem está com qual — o HUB, que é sempre o mais novo, compara e avisa
 * quem ficou para trás.
 */
const VERSAO = (() => {
  try {
    return JSON.parse(fsSync.readFileSync(path.join(RAIZ, 'package.json'), 'utf8')).version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
})();

/** Quantos lotes ler no máximo, ao conectar, até saber de quem é a caixa. */
const LOTES_PARA_IDENTIFICAR = 3;


/**
 * Quem pode embutir esta tela num iframe.
 *
 * O HUB Fiscal emoldura este agente (ver `web/moldura.js`), e para isso precisa
 * estar nesta lista. Sem `frame-ancestors`, porém, **qualquer** site poderia
 * embutir a ferramenta: ele não conseguiria ler nada de dentro — a origem é
 * outra —, mas conseguiria escondê-la sob a própria interface e colher cliques
 * em "Conectar certificado" e nos botões de download. Numa ferramenta que lê
 * nota fiscal com certificado digital, isso não é risco teórico.
 *
 * Ajustável por HUB_ORIGENS (origens separadas por espaço) para apontar a um
 * preview ou a um domínio próprio.
 */
const ORIGENS_MOLDURA =
  process.env.HUB_ORIGENS ||
  [
    "'self'",
    'https://validador-nf.vercel.app',
    'https://validador-nf-pedro-097b.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ].join(' ');

/** A empresa do certificado conectado agora. Uma por vez, sempre. */
const sessao = new SessaoEmpresa();

/** O Chrome fica aberto entre conectar e carregar, para não repedir o certificado. */
let adn = null;

let ocupado = false;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Vale para toda resposta, inclusive as de erro e as de arquivo: uma página
  // que escapasse desta linha seria justamente a que dá para embutir.
  res.setHeader('Content-Security-Policy', `frame-ancestors ${ORIGENS_MOLDURA}`);

  try {
    // `medidas` sai aqui de propósito: o extrator costuma rodar sem janela, e
    // "está lento" sem número nenhum não se investiga. Abrir esta URL responde
    // onde o tempo foi — espera do freio, rede, ou nem uma coisa nem outra.
    if (url.pathname === '/api/sessao') {
      return json(res, { versao: VERSAO, ...sessao.descrever(), medidas: adn?.medidas ?? null });
    }
    if (url.pathname === '/api/certificados') return await rotaCertificados(url, res);
    if (url.pathname === '/api/conectar') return await rotaConectar(url, res);
    if (url.pathname === '/api/carregar') return await rotaCarregar(url, res);
    if (url.pathname === '/api/desconectar') return await rotaDesconectar(res);
    if (url.pathname === '/api/relatorio') return rotaRelatorio(url, res);
    if (url.pathname === '/api/excel') return await rotaExcel(url, res);
    if (url.pathname === '/api/xml') return rotaXml(url, res);
    if (url.pathname === '/api/xmls') return await rotaXmls(url, res);
    if (url.pathname === '/api/validar') return await rotaValidar(req, url, res);
    return await servirEstatico(url, res);
  } catch (err) {
    console.error('[Servidor]', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ erro: err.message }));
    } else {
      res.end();
    }
  }
});

function json(res, dados, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(dados));
}

function abrirFluxo(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  return (dados) => res.write(`data: ${JSON.stringify(dados)}\n\n`);
}

async function servirEstatico(url, res) {
  const nome = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  const arquivo = path.join(WEB, nome);

  // Nunca servir fora de web/ — mesmo sendo local, path traversal é bug, não detalhe.
  if (!arquivo.startsWith(WEB)) {
    res.writeHead(403).end('Acesso negado');
    return;
  }

  try {
    const conteudo = await fs.readFile(arquivo);
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(arquivo)] ?? 'application/octet-stream' });
    res.end(conteudo);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Não encontrado');
  }
}

async function fecharAdn() {
  try {
    await adn?.fechar();
  } finally {
    adn = null;
  }
}

async function rotaDesconectar(res) {
  await fecharAdn();
  sessao.limpar();
  json(res, { ok: true });
}

/**
 * Etapa 1 — conecta o certificado e identifica a empresa.
 *
 * Lê poucos lotes, só o bastante para saber de quem é a caixa. O grosso da
 * leitura fica para a etapa 2, depois que os filtros forem escolhidos.
 */
/** A lista do repositório do Windows, para a tela montar o seletor. */
async function rotaCertificados(url, res) {
  try {
    const lista = await listarCertificados({ forcar: url.searchParams.get('atualizar') === 'true' });
    return json(res, { certificados: lista });
  } catch (err) {
    return json(res, { erro: err.message }, 500);
  }
}

async function rotaConectar(url, res) {
  const enviar = abrirFluxo(res);

  if (ocupado) {
    enviar({ tipo: 'erro', mensagem: 'Já existe uma operação em andamento.' });
    return res.end();
  }
  ocupado = true;

  // Trocar de certificado descarta a empresa anterior ANTES de começar: em nenhum
  // instante a tela pode mostrar dados de uma empresa sob o certificado de outra.
  await fecharAdn();
  sessao.limpar();

  try {
    adn = new SessaoAdn();
    const primeiro = await adn.conectar({
      thumbprint: url.searchParams.get('thumbprint') ?? '',
      aoStatus: (mensagem) => enviar({ tipo: 'status', mensagem }),
    });

    enviar({ tipo: 'status', mensagem: 'Identificando a empresa…' });

    let candidatos = sessao.identificar(primeiro.documentos);
    let nsu = maxNSU(primeiro.documentos);
    let lote = primeiro;

    // O que o ADN disse sobre a própria caixa. Estava sendo descartado, e é
    // justamente o que explica uma caixa que volta vazia.
    const sinais = new Set();
    const anotarSinais = (l) => {
      if (l.status) sinais.add(`status do ADN: ${l.status}`);
      for (const a of l.alertas ?? []) {
        const texto = [a.Codigo ?? a.codigo, a.Descricao ?? a.descricao].filter(Boolean).join(' — ');
        if (texto) sinais.add(texto);
      }
    };
    anotarSinais(primeiro);

    // Com pouquíssimas notas, prestador e tomador empatam como candidatos.
    // Mais um lote costuma desempatar; além disso não vale gastar requisição.
    for (let i = 1; candidatos.length !== 1 && i < LOTES_PARA_IDENTIFICAR && !lote.fim; i++) {
      lote = await adn.buscarLote(nsu);
      anotarSinais(lote);
      if (lote.documentos.length === 0) break;
      candidatos = sessao.identificar(lote.documentos);
      nsu = maxNSU(lote.documentos);
    }

    if (candidatos.length === 0) {
      throw new Error(explicarCaixaSemNotas(sessao.diagnostico, sinais));
    }

    if (candidatos.length > 1) {
      sessao.assumirDono(candidatos[0]);
      enviar({
        tipo: 'aviso',
        mensagem:
          `A caixa tem poucas notas e ${candidatos.length} CNPJ aparecem em todas elas. ` +
          `Assumi ${formatarCnpj(sessao.cnpj)} como a empresa do certificado.`,
      });
    }

    enviar({ tipo: 'fim', ...sessao.descrever() });
  } catch (err) {
    console.error('[Conexão]', err);
    await fecharAdn();
    sessao.limpar();
    enviar({ tipo: 'erro', mensagem: err.message });
  } finally {
    ocupado = false;
    res.end();
  }
}

/**
 * Etapa 2 — carrega apenas o período e o tipo pedidos.
 *
 * Em vez de ler a caixa inteira, localiza por busca binária o NSU onde o período
 * começa (ver src/janela.mjs) e lê só dali para a frente, descartando na hora o
 * que não interessa. Depois confere se a margem de segurança bastou; se o
 * documento mais antigo carregado já cai dentro do período, dobra a margem e
 * refaz — sinal de que o pulo pode ter passado por cima de alguma nota.
 */
async function rotaCarregar(url, res) {
  const enviar = abrirFluxo(res);

  if (ocupado) {
    enviar({ tipo: 'erro', mensagem: 'Já existe uma operação em andamento.' });
    return res.end();
  }
  if (!sessao.conectada || !adn?.conectada) {
    enviar({ tipo: 'erro', mensagem: 'Nenhum certificado conectado. Conecte um certificado primeiro.' });
    return res.end();
  }
  ocupado = true;

  const comecouEm = Date.now();
  const medidasAntes = adn.medidas;
  const filtro = lerFiltros(url);
  // Sem botão na tela: serve para auditoria, comparando o atalho com a leitura
  // completa da caixa. Basta acrescentar &lerTudo=true na URL de /api/carregar.
  const lerTudo = url.searchParams.get('lerTudo') === 'true';

  try {
    if (!filtro.de || !filtro.ate) throw new Error('Informe o período.');
    if (filtro.de > filtro.ate) throw new Error('A data inicial é posterior à final.');

    const margem = MARGEM[filtro.base] ?? MARGEM.emissao;
    let resultado;
    let tentativa = 0;
    let recuo = margem.antes;

    while (true) {
      sessao.reiniciarCarga(filtro);

      let nsuInicial = 0;
      let sondagens = 0;

      if (!lerTudo) {
        const achado = await localizarInicio(adn, somarDias(filtro.de, -recuo), {
          aoStatus: (mensagem) => enviar({ tipo: 'status', mensagem }),
        });
        nsuInicial = achado.nsu;
        sondagens = achado.sondagens;
        enviar({ tipo: 'status', mensagem: 'Lendo as notas…' });
      } else {
        enviar({ tipo: 'status', mensagem: 'Lendo as notas…' });
      }

      resultado = await lerJanela(adn, {
        nsuInicial,
        limiteFim: lerTudo ? '' : somarDias(filtro.ate, margem.depois),
        manter: (d) => sessao.considerar(d, filtro),
        aoProgresso: ({ lidos, mantidos, ultimaGeracao }) =>
          enviar({
            tipo: 'progresso',
            lidos,
            mantidos,
            mensagem: `${mantidos} nota(s) no período — ${lidos} documento(s) percorridos${
              ultimaGeracao ? `, até ${dataBR(ultimaGeracao)}` : ''
            }`,
          }),
      });
      resultado.sondagens = sondagens;
      resultado.nsuInicial = nsuInicial;

      for (const alerta of resultado.alertas ?? []) {
        enviar({ tipo: 'aviso', mensagem: `O ADN avisou: ${alerta}` });
      }

      sessao.concluirCarga();

      // Só faz sentido conferir a margem quando há margem: por competência a
      // janela começa exatamente na data pedida, de propósito.
      const maisAntiga = sessao.primeiraDataCarregada(filtro.base);
      const margemOk =
        lerTudo || recuo === 0 || nsuInicial === 0 || !maisAntiga || maisAntiga > filtro.de;

      if (margemOk || tentativa >= 1) {
        if (!margemOk) {
          enviar({
            tipo: 'aviso',
            mensagem:
              'A nota mais antiga carregada é do próprio primeiro dia do período. Pode haver nota ' +
              'anterior fora do alcance do atalho — vale conferir o total contra o portal.',
          });
        }
        break;
      }

      tentativa++;
      recuo *= 2;
      enviar({ tipo: 'status', mensagem: `Refazendo com margem maior (${recuo} dias) por segurança…` });
    }

    enviar({
      tipo: 'fim',
      ...sessao.descrever(),
      leitura: {
        lotes: resultado.lotes,
        percorridos: resultado.lidos,
        sondagens: resultado.sondagens,
        nsuInicial: resultado.nsuInicial,
        // Até quando a CAIXA tem documento — não é o mesmo que até quando o
        // portal tem nota. O ADN distribui com atraso, e quem acabou de emitir
        // precisa saber se está esperando o governo ou se perdeu alguma coisa.
        ultimaGeracao: resultado.ultimaGeracao,
        // O que o ADN respondeu no lote vazio que encerrou a leitura. Fica à
        // vista porque é o que distingue "acabou" de "ainda estou montando" —
        // e até aqui os dois eram a mesma coisa para quem olhava a tela.
        statusFinal: resultado.statusFinal,
        ms: Date.now() - comecouEm,
        chamadas: adn.medidas.chamadas - medidasAntes.chamadas,
        msRede: adn.medidas.msRede - medidasAntes.msRede,
        msEspera: adn.medidas.msEspera - medidasAntes.msEspera,
        sondagensPoupadas: adn.medidas.sondagensPoupadas - medidasAntes.sondagensPoupadas,
        ritmo: adn.medidas.ritmo,
      },
    });
  } catch (err) {
    console.error('[Carga]', err);
    // Janela fechada no meio: a sessão inteira morreu, não só esta carga. A tela
    // precisa voltar ao passo 1, senão o botão "Carregar" fica tentando em vão.
    if (err.reconectar) {
      await fecharAdn();
      sessao.limpar();
      enviar({ tipo: 'erro', mensagem: err.message, reconectar: true });
    } else {
      enviar({ tipo: 'erro', mensagem: err.message });
    }
  } finally {
    ocupado = false;
    res.end();
  }
}

const maxNSU = (docs) => docs.reduce((m, d) => Math.max(m, Number(d.NSU) || 0), 0);

/**
 * Por que a identificação não achou empresa nenhuma.
 *
 * Antes isto era uma frase só — "a caixa deste certificado não tem NFS-e" — que
 * afirmava uma causa entre várias possíveis e mandava para o lado errado quem
 * estava vendo as notas no portal. As causas são bem diferentes entre si:
 * caixa que não devolveu documento, caixa só de eventos, XML que o leitor não
 * entende. Cada uma leva a uma ação diferente, então cada uma tem de aparecer.
 */
function explicarCaixaSemNotas(d, sinais) {
  const doAdn = sinais.size ? ` O ADN informou: ${[...sinais].join('; ')}.` : '';
  const lidos = `Li os ${LOTES_PARA_IDENTIFICAR} primeiros lotes da caixa`;

  if (d.documentos === 0) {
    return (
      `${lidos} e o ADN não devolveu nenhum documento para este certificado.${doAdn} ` +
      'Se o portal mostra notas, confira se o certificado é do mesmo CNPJ que as emitiu ' +
      '(matriz e filial têm caixas separadas) e se o município usa o emissor nacional — ' +
      'nota de sistema municipal próprio não passa pelo ADN.'
    );
  }

  if (d.nfse === 0) {
    const partes = [`${d.documentos} documento(s)`];
    if (d.eventos) partes.push(`${d.eventos} evento(s)`);
    if (d.outros) partes.push(`${d.outros} de outro tipo`);
    if (d.ilegiveis) partes.push(`${d.ilegiveis} que não consegui ler`);
    return (
      `${lidos}: ${partes.join(', ')} — e nenhuma NFS-e utilizável.${doAdn}` +
      (d.ilegiveis
        ? ' Documentos ilegíveis costumam ser leiaute que este leitor ainda não cobre.'
        : '')
    );
  }

  return (
    `${lidos} e encontrei ${d.nfse} NFS-e, mas nenhum CNPJ se repete o bastante ` +
    `para ser o dono da caixa.${doAdn}`
  );
}

function lerFiltros(url) {
  return {
    tipo: url.searchParams.get('tipo') || 'EMITIDA',
    de: url.searchParams.get('de') || '',
    ate: url.searchParams.get('ate') || '',
    base: url.searchParams.get('base') || 'emissao',
    incluirCanceladas: url.searchParams.get('incluirCanceladas') !== 'false',
  };
}

const SEM_CARGA = { erro: 'Nenhuma nota carregada. Escolha o período e clique em "Carregar notas".' };

/**
 * As notas que o pedido alcança: a carga já limitou tipo e período, aqui sobram
 * a preferência de exibição (esconder canceladas) e, quando vier, a seleção feita
 * na tela — `nsus=1,2,3`. Sem `nsus`, vale tudo o que está carregado.
 */
function notasDoPedido(url) {
  const f = { ...sessao.filtro, incluirCanceladas: url.searchParams.get('incluirCanceladas') !== 'false' };
  const notas = filtrar(sessao.notas, f);

  const bruto = url.searchParams.get('nsus');
  if (!bruto) return { filtros: f, notas };

  const escolhidos = new Set(
    bruto.split(',').map((n) => Number.parseInt(n, 10)).filter(Number.isInteger)
  );

  // Escolha explícita vence o filtro de exibição.
  //
  // `incluirCanceladas` serve para limpar a tela; aplicá-lo por cima de uma lista
  // de NSU que a pessoa marcou faria o download sair com menos notas do que ela
  // pediu, sem avisar. Acontece de verdade no validador: o bloco de divergência
  // de cancelamento é feito de notas canceladas, e com a caixa desmarcada o zip
  // sairia vazio.
  const todas = filtrar(sessao.notas, { ...f, incluirCanceladas: true });
  return {
    filtros: f,
    notas: todas.filter((n) => escolhidos.has(Number(n.nsu))),
    selecao: escolhidos.size,
  };
}

function rotaRelatorio(url, res) {
  if (!sessao.carregada) return json(res, SEM_CARGA, 409);

  const { filtros: f, notas } = notasDoPedido(url);

  json(res, {
    empresa: { cnpj: sessao.cnpj, nome: sessao.nome, carregadaEm: sessao.carregadaEm },
    filtros: f,
    resumo: resumir(notas),
    // Fora do relatório, mas declarado: ver o comentário em SessaoEmpresa.considerar.
    intermediadas: sessao.intermediadas,
    notas,
  });
}

async function rotaExcel(url, res) {
  if (!sessao.carregada) return json(res, SEM_CARGA, 409);

  const { filtros: f, notas, selecao } = notasDoPedido(url);
  const buffer = await gerarExcel(notas, { empresa: sessao.nome || formatarCnpj(sessao.cnpj), ...f });

  const rotulo = f.tipo === 'EMITIDA' ? 'emitidas' : 'tomadas';
  const nome = selecao
    ? `NFSe-${rotulo}-selecao-${notas.length}-notas.xlsx`
    : `NFSe-${rotulo}-${f.de || 'inicio'}-a-${f.ate || 'hoje'}.xlsx`;

  res.writeHead(200, {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="${nome}"`,
    'Content-Length': buffer.length,
  });
  res.end(buffer);
}

/**
 * Baixa em lote os XMLs das notas do pedido, num .zip.
 *
 * Sem `nsus`, leva todas as notas da consulta; com `nsus`, só as marcadas na tela.
 * O XML é o documento fiscal assinado — é dele que o escritório precisa guardar,
 * não do PDF.
 */
async function rotaXmls(url, res) {
  if (!sessao.carregada) return json(res, SEM_CARGA, 409);

  const { filtros: f, notas, selecao } = notasDoPedido(url);
  if (notas.length === 0) return json(res, { erro: 'Nenhuma nota para baixar.' }, 400);

  const zip = new JSZip();
  const usados = new Map();

  for (const n of notas) {
    const conteudo = sessao.xml('NFSE', n.nsu);
    if (!conteudo) continue;

    const contraparte = n.tipo === 'EMITIDA' ? n.tomaNome : n.emitNome;
    // Número + contraparte + NSU: legível na pasta e único mesmo se o portal
    // repetir número entre séries.
    let nome = sanitizarNome(`${n.numero} - ${contraparte} - ${n.nsu}.xml`);
    const repeticoes = (usados.get(nome) ?? 0) + 1;
    usados.set(nome, repeticoes);
    if (repeticoes > 1) nome = nome.replace(/\.xml$/, ` (${repeticoes}).xml`);

    // Uma pasta por competência: é assim que a conferência é arquivada.
    const pasta = (n.competencia || n.dataEmissao || '').slice(0, 7).replace('-', '');
    zip.file(pasta ? `${pasta}/${nome}` : nome, conteudo);
  }

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const rotulo = f.tipo === 'EMITIDA' ? 'emitidas' : 'tomadas';
  const nomeZip = selecao
    ? `NFSe-${rotulo}-selecao-${notas.length}-notas.zip`
    : `NFSe-${rotulo}-${f.de || 'inicio'}-a-${f.ate || 'hoje'}.zip`;

  res.writeHead(200, {
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${nomeZip}"`,
    'Content-Length': buffer.length,
  });
  res.end(buffer);
}

/** Nome de arquivo aceito pelo Windows, sem acento perdido nem caractere proibido. */
function sanitizarNome(s) {
  return String(s)
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function rotaXml(url, res) {
  if (!sessao.carregada) return json(res, SEM_CARGA, 409);

  const nsu = Number.parseInt(url.searchParams.get('nsu') ?? '', 10);
  const tipo = url.searchParams.get('tipo') === 'EVENTO' ? 'EVENTO' : 'NFSE';
  if (!Number.isInteger(nsu)) return json(res, { erro: 'NSU inválido.' }, 400);

  const conteudo = sessao.xml(tipo, nsu);
  if (!conteudo) return json(res, { erro: 'XML não encontrado nesta sessão.' }, 404);

  res.writeHead(200, {
    'Content-Type': 'application/xml; charset=utf-8',
    'Content-Disposition': `attachment; filename="NFSe-${nsu}.xml"`,
  });
  res.end(conteudo);
}

/**
 * Confronta as notas carregadas com o arquivo de lançamentos enviado.
 *
 * O arquivo chega como corpo binário puro, com o nome em `?nome=` — sem multipart,
 * que aqui só somaria código. Ele é lido em memória e descartado: nada é gravado,
 * como o resto da ferramenta.
 */
async function rotaValidar(req, url, res) {
  if (!sessao.carregada) return json(res, SEM_CARGA, 409);

  const pedacos = [];
  let bytes = 0;
  for await (const p of req) {
    bytes += p.length;
    if (bytes > 80 * 1024 * 1024) return json(res, { erro: 'Arquivo grande demais (limite de 80 MB).' }, 413);
    pedacos.push(p);
  }
  if (bytes === 0) return json(res, { erro: 'Nenhum arquivo recebido.' }, 400);

  try {
    const { lancamentos, colunaDocumento, colunaValor, totalLinhas } = await lerLancamentos(
      Buffer.concat(pedacos),
      url.searchParams.get('nome') || ''
    );

    // Valida contra as mesmas notas que a tela está mostrando.
    const { notas } = notasDoPedido(url);
    const resultado = validar(notas, lancamentos);

    json(res, {
      arquivo: {
        nome: url.searchParams.get('nome') || 'arquivo',
        linhas: totalLinhas,
        lancamentos: lancamentos.length,
        colunaDocumento,
        colunaValor,
      },
      totalNotas: notas.length,
      ...resultado,
    });
  } catch (err) {
    console.error('[Validador]', err);
    json(res, { erro: err.message }, 400);
  }
}

const formatarCnpj = (d) => (d || '').replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
const dataBR = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

// Encerrar solta o certificado e descarta os documentos da memória.
for (const sinal of ['SIGINT', 'SIGTERM']) {
  process.on(sinal, async () => {
    await fecharAdn();
    process.exit(0);
  });
}

/**
 * Porta ocupada quase sempre significa "já está aberto", não erro.
 *
 * Antes isso subia como exceção não tratada e despejava uma pilha de chamadas do
 * Node na tela — e quem abriu a ferramenta pela segunda vez concluía que ela
 * estava quebrada. Custou uma rodada inteira de investigação aqui dentro, com
 * duas pessoas achando que o código novo estava rodando quando não estava.
 */
servidor.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `\n  O extrator já está aberto nesta máquina.\n` +
        `  Abra http://localhost:${PORTA} — é a janela que já está rodando.\n\n` +
        `  Se quiser começar do zero, feche a outra janela primeiro.\n`,
    );
    process.exit(1);
  }
  console.error(`\n  Não consegui abrir o servidor: ${err.message}\n`);
  process.exit(1);
});

/**
 * Subir: conferir se há versão nova, e só então abrir a porta.
 *
 * A ordem importa. Atualizar ANTES de ocupar a porta deixa o processo novo
 * subir limpo, e deixa este aqui livre para fazer a única coisa que ele pode
 * fazer e o novo não: vigiar se o novo realmente subiu, e desfazer se não.
 */
async function subir() {
  const resultado = await atualizar({
    raiz: RAIZ,
    versaoAtual: VERSAO,
    jaAtualizouPara: process.env.EXTRATOR_JA_ATUALIZOU || '',
    registrar: (m) => console.log(`  Atualização: ${m}`),
  });

  if (resultado.atualizou) return trocarDeVersao(resultado);

  // Hub fora do ar não é notícia: só aparece se alguém estiver olhando o console.
  if (resultado.motivo && !/mais recente/.test(resultado.motivo)) {
    console.log(`  Atualização: ${resultado.motivo}`);
  }

  servidor.listen(PORTA, '127.0.0.1', () => {
    console.log(`\n  Relatório de NFS-e ${VERSAO}\n  http://localhost:${PORTA}\n`);
    console.log('  Feche esta janela para encerrar — os documentos saem da memória junto.\n');
    conferirCurl();
    // Subindo junto com o Windows, abrir o navegador a cada login seria uma janela
    // pulando na cara de quem nem vai usar a ferramenta hoje.
    const calado = process.env.ABRIR_NAVEGADOR === 'nao' || process.argv.includes('--sem-navegador');
    if (!calado) abrirNavegador();
  });
}

/**
 * Entrega o lugar para a versão recém-instalada — e só sai depois de ver que ela
 * ficou de pé.
 *
 * Quem acabou de trocar os arquivos ainda está rodando o código ANTIGO, em
 * memória. Isso é o que torna a supervisão possível: este processo é a última
 * cópia funcionando da versão que se sabe boa. Se a nova não atender, ele devolve
 * os arquivos antigos e sobe de novo.
 *
 * Sem isso, uma versão quebrada deixaria a pessoa sem ferramenta e sem como
 * consertar, à espera de um .zip — que é exatamente o que a atualização
 * automática veio eliminar.
 */
async function trocarDeVersao(info) {
  console.log(`\n  Atualizado da versão ${info.de} para a ${info.para}. Reiniciando…\n`);

  const novo = reabrir(info.para);
  if (await atendeu(20000)) {
    console.log('  A versão nova está no ar.\n');
    process.exit(0);
  }

  console.error('  A versão nova não subiu em 20s. Voltando para a anterior…');

  // Antes de qualquer coisa: anotar que esta versão não sobe aqui. Sem isso, a
  // cópia restaurada instala a mesma de novo e a ferramenta nunca abre.
  await marcarRuim(RAIZ, info.para);
  try {
    process.kill(novo.pid);
  } catch {
    // Já morreu sozinho — que é a explicação mais provável para não ter atendido.
  }

  const voltou = await voltarAtras(RAIZ);
  console.error(voltou ? `  Voltei para a versão ${info.de}.\n` : '  Não consegui voltar atrás.\n');
  reabrir(info.para);
  process.exit(1);
}

/** Sobe outra cópia do extrator, solta desta. */
function reabrir(versaoInstalada) {
  const filho = spawn(process.execPath, [path.join(RAIZ, 'servidor.mjs'), ...process.argv.slice(2)], {
    cwd: RAIZ,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    // Trava contra laço: se a troca não mudar a versão por algum motivo, o filho
    // não tenta atualizar de novo para a mesma coisa.
    env: { ...process.env, EXTRATOR_JA_ATUALIZOU: versaoInstalada },
  });
  filho.unref();
  return filho;
}

/** A porta voltou a responder? É o único sinal confiável de que a nova subiu. */
async function atendeu(limiteMs) {
  const ate = Date.now() + limiteMs;
  while (Date.now() < ate) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const r = await fetch(`http://127.0.0.1:${PORTA}/api/sessao`);
      if (r.ok) return true;
    } catch {
      // Ainda subindo.
    }
  }
  return false;
}

subir();

/**
 * O `curl.exe` do Windows é quem fala mTLS com o repositório de certificados.
 * Ele vem no Windows 10 1803+ e no 11, mas se faltar é melhor dizer agora, na
 * primeira linha do console, do que na primeira tentativa de conectar.
 */
function conferirCurl() {
  execFile('curl.exe', ['--version'], { windowsHide: true }, (erro, saida) => {
    if (erro) {
      console.error('  ATENÇÃO: não encontrei o curl.exe do Windows. A conexão com o ADN não vai funcionar.\n');
      return;
    }
    if (!/schannel/i.test(saida)) {
      console.error(
        '  ATENÇÃO: o curl encontrado não usa Schannel, então não enxerga o repositório de\n' +
          '  certificados do Windows. Se outro curl estiver antes no PATH, é ele que está sendo achado.\n',
      );
    }
  });
}

function abrirNavegador() {
  // `start` é do cmd, não um executável — daí o /c. O "" é o título da janela,
  // que o start exige quando o primeiro argumento vem entre aspas.
  execFile('cmd.exe', ['/c', 'start', '', `http://localhost:${PORTA}`], { windowsHide: true }, () => {});
}
