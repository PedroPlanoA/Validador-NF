// Mantém o extrator atualizado sozinho, buscando o código no Hub Fiscal.
//
// ── Por que existe ──
// A ferramenta roda na máquina de cada pessoa, porque o certificado digital tem
// de ser apresentado de lá. Isso cria um problema que o Hub não tem: cada
// correção precisava virar um .zip, ser distribuída à mão e instalada por quem
// recebeu. Quem não instalasse ficava com o defeito — e, como foi o caso que
// originou este arquivo, um defeito que esconde nota fiscal pode levar meses
// para ser notado por quem ficou para trás.
//
// ── O que é trocado, e o que nunca é ──
// Só o código: `src/`, `web/`, `servidor.mjs`, `package.json` e os atalhos .bat.
// São uns 300 KB. O `node/node.exe` — 92 MB, o motor — fica onde está, e é por
// isso que isto funciona com o extrator aberto: o Windows tranca o executável em
// uso, e o executável é justamente o único arquivo que nunca muda.
//
// `node_modules` também não é trocado. Se uma dependência mudar, a atualização
// automática não serve, e quem avisa é o `publicar.mjs` — ele se recusa a
// publicar nesse caso, em vez de mandar meia atualização para a rua.
//
// ── O que acontece quando dá errado ──
// Três regras, nessa ordem de importância:
//
//   1. **Hub fora do ar nunca impede o extrator de abrir.** Falhou a consulta,
//      falhou o download, veio arquivo corrompido: registra e segue com a versão
//      que já está instalada. Uma ferramenta que não abre porque a internet caiu
//      é pior que uma ferramenta desatualizada.
//   2. **Cada arquivo é conferido pelo sha256 do manifesto** antes de entrar no
//      lugar. Download pela metade não vira instalação.
//   3. **A versão anterior fica guardada.** Quem chama supervisiona a nova: se
//      ela não atender em 20 segundos, a anterior volta. Sem isso, uma versão
//      quebrada deixaria a pessoa sem ferramenta e sem como consertar — de volta
//      ao .zip na mão, que é o que isto veio eliminar.

import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const HUB = process.env.HUB_FISCAL || 'https://validador-nf.vercel.app';
const MANIFESTO = `${HUB}/extrator/manifest.json`;
const TEMPO_LIMITE_MS = 15000;

/** Onde o download fica até ser conferido, e onde a versão anterior é guardada. */
const PASTA_NOVA = '.atualizacao';
const PASTA_ANTERIOR = '.anterior';

/**
 * A versão que já provou não subir nesta máquina.
 *
 * Sem esta memória, voltar atrás não resolve nada: o processo restaurado sobe,
 * vê a mesma versão no Hub, instala de novo, quebra de novo, volta de novo — e
 * como a atualização acontece ANTES de abrir a porta, a ferramenta nunca chega a
 * funcionar. Foi exatamente o que aconteceu no primeiro ensaio: o conserto
 * parecia certo nos registros e a porta não respondia nunca.
 *
 * Fica em arquivo, e não só em memória, para a trava sobreviver ao reinício —
 * senão todo boot repetiria o ciclo inteiro antes de se aquietar. Deixa de valer
 * sozinha quando o Hub publicar algo mais novo que a versão queimada, que é
 * justamente o sinal de que o problema foi corrigido lá.
 */
const ARQUIVO_RUIM = '.versao-ruim';

/** Anota que esta versão não sobe aqui, para não tentá-la de novo. */
export async function marcarRuim(raiz, versao) {
  try {
    await fs.writeFile(path.join(raiz, ARQUIVO_RUIM), String(versao), 'utf8');
  } catch {
    // Disco somente leitura ou pasta protegida: a trava de processo (`EXTRATOR_JA_ATUALIZOU`)
    // ainda segura este boot. Falhar aqui não pode impedir a volta atrás.
  }
}

/** `0.4.10` tem de ser maior que `0.4.9` — comparar texto diria o contrário. */
export function versaoMenor(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y;
  }
  return false;
}

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

async function buscar(url, comoTexto = false) {
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  try {
    const r = await fetch(url, { signal: controle.signal, cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return comoTexto ? await r.text() : Buffer.from(await r.arrayBuffer());
  } finally {
    clearTimeout(relogio);
  }
}

/**
 * Caminho de dentro do pacote, recusando qualquer coisa que escape da pasta.
 *
 * O manifesto vem da rede. Mesmo sendo o nosso servidor, um caminho como
 * `..\\..\\Windows\\System32\\…` não pode ser escrito só porque chegou por ali —
 * é a diferença entre atualizar um programa e deixar qualquer resposta HTTP
 * escrever onde quiser no disco.
 */
function destinoSeguro(raiz, relativo) {
  if (typeof relativo !== 'string' || !relativo || path.isAbsolute(relativo)) return null;
  const limpo = relativo.replace(/\\/g, '/');
  if (limpo.split('/').some((p) => p === '..' || p === '')) return null;
  const destino = path.resolve(raiz, limpo);
  const dentro = path.resolve(raiz) + path.sep;
  return destino.startsWith(dentro) ? destino : null;
}

/**
 * Confere se há versão nova e, havendo, troca os arquivos.
 *
 * Devolve `{ atualizou, de, para, motivo }`. `atualizou: true` significa que os
 * arquivos no disco JÁ são os novos e que este processo está rodando o código
 * velho — quem chamou precisa reiniciar.
 */
export async function atualizar({ raiz, versaoAtual, jaAtualizouPara = '', registrar = () => {} }) {
  let manifesto;
  try {
    manifesto = JSON.parse(await buscar(MANIFESTO, true));
  } catch (err) {
    // Sem internet, Hub no ar e sem o arquivo, DNS bloqueado pela rede da
    // empresa: tudo cai aqui, e tudo tem a mesma resposta — seguir em frente.
    return { atualizou: false, motivo: `não consegui falar com o Hub (${err.message})` };
  }

  const nova = String(manifesto?.versao ?? '');
  if (!nova || !Array.isArray(manifesto.arquivos) || manifesto.arquivos.length === 0) {
    return { atualizou: false, motivo: 'o Hub respondeu um manifesto que não entendi' };
  }
  if (!versaoMenor(versaoAtual, nova)) {
    return { atualizou: false, motivo: 'já está na versão mais recente' };
  }

  // Trava contra laço de atualização.
  //
  // Este processo foi aberto por outro que acabou de instalar `jaAtualizouPara`.
  // Se, mesmo assim, a versão lida do disco continua menor que a do Hub, alguma
  // coisa não trocou como devia — e tentar de novo faria o extrator reiniciar
  // em círculo, para sempre, sem nunca abrir. Melhor rodar desatualizado e
  // deixar o aviso no console do que não rodar.
  if (jaAtualizouPara && !versaoMenor(jaAtualizouPara, nova)) {
    return {
      atualizou: false,
      motivo: `a troca para ${jaAtualizouPara} não pegou; seguindo com a ${versaoAtual} para não reiniciar em círculo`,
    };
  }

  const ruim = await fs.readFile(path.join(raiz, ARQUIVO_RUIM), 'utf8').catch(() => '');
  if (ruim.trim() && !versaoMenor(ruim.trim(), nova)) {
    return {
      atualizou: false,
      motivo: `a versão ${ruim.trim()} já não subiu nesta máquina; esperando o Hub publicar uma mais nova`,
    };
  }

  registrar(`versão ${nova} disponível (esta é a ${versaoAtual}) — baixando…`);

  const temporaria = path.join(raiz, PASTA_NOVA);
  await fs.rm(temporaria, { recursive: true, force: true });

  // 1) Baixar tudo e conferir ANTES de tocar em qualquer arquivo em uso.
  const baixados = [];
  try {
    for (const item of manifesto.arquivos) {
      const destino = destinoSeguro(temporaria, item.caminho);
      if (!destino) throw new Error(`caminho recusado no manifesto: ${item.caminho}`);

      const conteudo = await buscar(`${HUB}/extrator/${item.caminho.replace(/\\/g, '/')}`);
      const digest = sha256(conteudo);
      if (item.sha256 && digest !== item.sha256) {
        throw new Error(`${item.caminho} veio diferente do esperado`);
      }

      await fs.mkdir(path.dirname(destino), { recursive: true });
      await fs.writeFile(destino, conteudo);
      baixados.push(item.caminho);
    }
  } catch (err) {
    await fs.rm(temporaria, { recursive: true, force: true });
    return { atualizou: false, motivo: `download incompleto: ${err.message}` };
  }

  // 2) Guardar o que está instalado. É a rede de segurança de quem chamou.
  const anterior = path.join(raiz, PASTA_ANTERIOR);
  await fs.rm(anterior, { recursive: true, force: true });
  for (const relativo of baixados) {
    const atual = destinoSeguro(raiz, relativo);
    if (!atual || !fsSync.existsSync(atual)) continue; // arquivo novo: nada a guardar
    const guardado = path.join(anterior, relativo);
    await fs.mkdir(path.dirname(guardado), { recursive: true });
    await fs.copyFile(atual, guardado);
  }

  // 3) Trocar. Daqui para a frente o disco é a versão nova.
  for (const relativo of baixados) {
    const destino = destinoSeguro(raiz, relativo);
    await fs.mkdir(path.dirname(destino), { recursive: true });
    await fs.copyFile(path.join(temporaria, relativo), destino);
  }
  await fs.rm(temporaria, { recursive: true, force: true });

  registrar(`atualizado para ${nova}`);
  return { atualizou: true, de: versaoAtual, para: nova, arquivos: baixados.length };
}

/** Desfaz a troca, devolvendo o que estava instalado antes. */
export async function voltarAtras(raiz) {
  const anterior = path.join(raiz, PASTA_ANTERIOR);
  if (!fsSync.existsSync(anterior)) return false;

  const copiarPasta = async (de, para) => {
    for (const item of await fs.readdir(de, { withFileTypes: true })) {
      const origem = path.join(de, item.name);
      const destino = path.join(para, item.name);
      if (item.isDirectory()) {
        await fs.mkdir(destino, { recursive: true });
        await copiarPasta(origem, destino);
      } else {
        await fs.copyFile(origem, destino);
      }
    }
  };

  await copiarPasta(anterior, raiz);
  await fs.rm(anterior, { recursive: true, force: true });
  return true;
}
