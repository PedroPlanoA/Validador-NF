// Lista os certificados digitais instalados no Windows de quem está usando.
//
// Substitui o diálogo nativo do Chrome. A diferença não é estética: o diálogo
// mostra os 362 certificados de um escritório de contabilidade em ordem fixa,
// sem busca, sem CNPJ legível e **sem dizer quais estão vencidos** — e uma
// empresa costuma ter três entradas com o mesmo nome, duas delas vencidas. Errar
// a escolha ali é questão de tempo, e o erro só aparece muitos passos depois.
//
// O repositório é por usuário do Windows (`CurrentUser`), então cada pessoa vê
// os certificados dela, na máquina dela. Nada aqui lê chave privada: só o que é
// público — titular, validade e a impressão digital que identifica o certificado
// na hora de apresentá-lo.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const executar = promisify(execFile);

/**
 * `LocalMachine` entra também porque há certificado instalado para a máquina
 * toda, não só para o usuário. A origem é devolvida junto: são lojas diferentes
 * na hora de apresentar o certificado, e confundir as duas faz a conexão falhar
 * sem explicação.
 */
const SCRIPT = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$lojas = @(
  @{ Caminho = 'Cert:\\CurrentUser\\My';  Origem = 'CurrentUser' },
  @{ Caminho = 'Cert:\\LocalMachine\\My'; Origem = 'LocalMachine' }
)
$saida = foreach ($loja in $lojas) {
  try { $itens = Get-ChildItem $loja.Caminho -ErrorAction Stop } catch { continue }
  foreach ($c in $itens) {
    if (-not $c.HasPrivateKey) { continue }
    [pscustomobject]@{
      thumbprint = $c.Thumbprint
      titular    = $c.Subject
      de         = $c.NotBefore.ToString('yyyy-MM-dd')
      ate        = $c.NotAfter.ToString('yyyy-MM-dd')
      origem     = $loja.Origem
    }
  }
}
ConvertTo-Json -InputObject @($saida) -Compress
`;

/** `CN=PESQUISA NA PRATICA TREINAMENTOS E CURSOS LTDA:36962787000110, OU=…` */
function lerTitular(subject) {
  const cn = /CN=([^,]+)/.exec(subject || '');
  const inteiro = (cn ? cn[1] : subject || '').trim();

  // O documento vem depois do ÚLTIMO `:` — razão social pode conter `:`, e o
  // CNPJ/CPF é sempre o rabo da linha.
  const corte = inteiro.lastIndexOf(':');
  if (corte < 0) return { nome: inteiro, documento: '' };

  const documento = inteiro.slice(corte + 1).replace(/\D/g, '');
  // Só é documento se tiver a cara de um: 14 dígitos (CNPJ) ou 11 (CPF).
  if (documento.length !== 14 && documento.length !== 11) {
    return { nome: inteiro, documento: '' };
  }
  return { nome: inteiro.slice(0, corte).trim(), documento };
}

/**
 * Devolve os certificados com chave privada, ordenados pelos válidos primeiro e
 * depois por nome.
 *
 * O vencido **não é escondido**: ele aparece marcado. Sumir com ele faria a
 * pessoa procurar um certificado que ela sabe que instalou e não achar — o que
 * é pior que mostrá-lo e dizer que não serve.
 */
/** Ler 371 certificados leva ~4s (o Windows é lento nisso), e a tela pede a
 *  lista mais de uma vez: ao abrir o seletor e ao conferir a escolha. O cache
 *  evita repetir a espera; instalou certificado novo, `forcar` traz de novo. */
let cache = null;
const VALIDADE_CACHE_MS = 60_000;

export async function listarCertificados({ hoje = new Date(), forcar = false } = {}) {
  if (!forcar && cache && Date.now() - cache.em < VALIDADE_CACHE_MS) return cache.lista;

  let bruto;
  try {
    const { stdout } = await executar(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', SCRIPT],
      { maxBuffer: 32 * 1024 * 1024, windowsHide: true },
    );
    bruto = stdout;
  } catch (err) {
    throw new Error(`Não consegui ler o repositório de certificados do Windows: ${err.message}`);
  }

  let lista;
  try {
    lista = JSON.parse(bruto.trim() || '[]');
  } catch {
    throw new Error('O Windows devolveu uma lista de certificados que não consegui interpretar.');
  }

  const dia = hoje.toISOString().slice(0, 10);

  const certificados = (Array.isArray(lista) ? lista : [lista])
    .map((c) => {
      const { nome, documento } = lerTitular(c.titular);
      return {
        thumbprint: c.thumbprint,
        nome,
        documento,
        de: c.de,
        ate: c.ate,
        origem: c.origem,
        valido: c.de <= dia && dia <= c.ate,
        vencido: c.ate < dia,
        // O repositório do Windows guarda também certificados internos do
        // sistema, com nome de GUID e sem CNPJ. Não são de empresa nenhuma e não
        // servem aqui — ficam por último, nunca disputando o topo da lista.
        daEmpresa: documento !== '',
      };
    })
    .sort(
      (a, b) =>
        Number(b.daEmpresa) - Number(a.daEmpresa) ||
        Number(b.valido) - Number(a.valido) ||
        a.nome.localeCompare(b.nome, 'pt-BR'),
    );

  cache = { em: Date.now(), lista: certificados };
  return certificados;
}

/** Confere que a impressão digital existe antes de tentar usá-la. */
export async function acharCertificado(thumbprint) {
  const alvo = (thumbprint || '').replace(/[^0-9a-fA-F]/g, '').toUpperCase();
  if (!alvo) return null;
  const todos = await listarCertificados();
  return todos.find((c) => c.thumbprint.toUpperCase() === alvo) ?? null;
}
