import "server-only";
import { EMPRESAS_DEMO } from "./demo";
import { chaveEmpresa, type EmpresaAcessorias, type RespostaEmpresa, type RespostaEmpresas } from "./tipos";

/**
 * Cliente da API do Acessórias (https://api.acessorias.com/documentation).
 *
 * - Autenticação: `Authorization: Bearer <token>`. O token é gerado no
 *   Acessórias em Engrenagem → "API Token" e fica **só no servidor**
 *   (`ACESSORIAS_TOKEN` no `.env.local`) — o navegador nunca o vê.
 * - `ListAll` devolve 20 empresas por página; lemos página a página até vir
 *   uma lista vazia.
 * - Limite de 100 requisições/minuto: por isso a lista fica em cache na memória
 *   do servidor por `CACHE_TTL_MS`, e em caso de HTTP 429 esperamos e tentamos
 *   de novo.
 */
const BASE_URL = "https://api.acessorias.com";

/** Tudo o que a consulta de empresas sabe devolver — a escolha do que aparece
 *  na ficha é feita depois, na configuração de campos. */
const INCLUIR = "obligations&departments&stateRegistrations&contacts&registrationData";

const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_PAGINAS = 200;
/** Páginas buscadas ao mesmo tempo. 6 medido sem nenhum 429; 8 também passou,
 *  mas 6 deixa folga para a API não reclamar em horário de pico. */
const CONCORRENCIA = 6;
const ESPERA_429_MS = 6000;
const TENTATIVAS_429 = 4;

type Cache = { dados: RespostaEmpresas; em: number; carregando?: Promise<RespostaEmpresas> };

// Guardado em globalThis para sobreviver ao hot reload do `next dev`.
const g = globalThis as unknown as { __diarioCache?: Cache };

function token(): string | null {
  const t = process.env.ACESSORIAS_TOKEN?.trim();
  return t ? t : null;
}

export function modoDemo(): boolean {
  return token() === null;
}

class ErroAcessorias extends Error {}

async function chamar(caminho: string): Promise<unknown> {
  for (let tentativa = 0; ; tentativa++) {
    const res = await fetch(`${BASE_URL}${caminho}`, {
      headers: { Authorization: `Bearer ${token()}`, Accept: "application/json" },
      cache: "no-store",
    });

    if (res.status === 429 && tentativa < TENTATIVAS_429) {
      await new Promise((r) => setTimeout(r, ESPERA_429_MS));
      continue;
    }
    if (res.status === 401 || res.status === 403) {
      throw new ErroAcessorias("Token do Acessórias inválido ou sem permissão (verifique ACESSORIAS_TOKEN).");
    }
    // Empresa não encontrada vem como 404 com corpo vazio ou mensagem.
    if (res.status === 404) return null;
    if (!res.ok) throw new ErroAcessorias(`Acessórias respondeu HTTP ${res.status}.`);

    const texto = await res.text();
    if (!texto.trim()) return null;
    const json = JSON.parse(texto) as unknown;
    // Erros de parâmetro vêm como HTTP 200 com a chave "Erro".
    if (json && typeof json === "object" && !Array.isArray(json) && "Erro" in json) {
      throw new ErroAcessorias(String((json as { Erro: unknown }).Erro));
    }
    return json;
  }
}

/** A API às vezes devolve um objeto único em vez de lista — normaliza. */
function comoLista(json: unknown): EmpresaAcessorias[] {
  if (!json) return [];
  if (Array.isArray(json)) return json as EmpresaAcessorias[];
  if (typeof json === "object" && "Identificador" in json) return [json as EmpresaAcessorias];
  return [];
}

async function buscarTodas(): Promise<RespostaEmpresas> {
  if (modoDemo()) {
    return { empresas: EMPRESAS_DEMO, atualizadoEm: new Date().toISOString(), fonte: "demo" };
  }

  const empresas: EmpresaAcessorias[] = [];
  const vistas = new Set<string>();

  // Páginas em **paralelo** e **sem os includes**.
  //
  // Medido contra a carteira real (424 empresas, 20 por página, 23 páginas):
  //   sequencial + includes ... 17,7s e 2,25 MB
  //   paralelo   + includes ...  ~5s
  //   paralelo   sem includes ... 1,2s e 0,13 MB
  //
  // A lista de clientes só mostra Razao, Fantasia, Identificador, Status e
  // Regime — nada que venha dos includes. Carregar obrigações, departamentos e
  // contatos das 424 para desenhar uma lista de nomes eram 12 segundos jogados
  // fora em cada abertura. A ficha continua buscando a empresa inteira quando é
  // aberta (`buscarEmpresa`, 258ms), que é onde esses dados aparecem.
  //
  // Concorrência 6 testada sem nenhum 429; o `chamar` já repete se aparecer.
  for (let inicio = 1; inicio <= MAX_PAGINAS; inicio += CONCORRENCIA) {
    const numeros = Array.from({ length: CONCORRENCIA }, (_, i) => inicio + i);
    const lotes = await Promise.all(
      numeros.map((p) => chamar(`/companies/ListAll/?Pagina=${p}`).then(comoLista)),
    );

    let novas = 0;
    for (const lote of lotes) {
      for (const e of lote) {
        const k = chaveEmpresa(e) || String(e.ID);
        if (vistas.has(k)) continue;
        vistas.add(k);
        empresas.push(e);
        novas++;
      }
    }

    // Uma página vazia no grupo significa que a carteira acabou; nenhuma nova em
    // todo o grupo também protege contra a API repetir páginas.
    if (novas === 0 || lotes.some((l) => l.length === 0)) break;
  }

  // Uma empresa **com** os includes, para o catálogo de campos.
  //
  // `catalogoCompleto` descobre os campos disponíveis a partir das empresas
  // carregadas, e é ele que alimenta a tela de configuração da ficha. Sem os
  // includes em nenhuma delas, sumiriam da configuração obrigações,
  // departamentos, contatos e inscrições estaduais. Uma amostra basta para
  // declarar as chaves, e custa 258ms.
  const amostra = empresas[0] && chaveEmpresa(empresas[0]);
  if (amostra) {
    try {
      const [completa] = comoLista(await chamar(`/companies/${amostra}/?${INCLUIR}`));
      if (completa) empresas[0] = completa;
    } catch {
      // Sem a amostra o catálogo fica menor, mas a lista abre — e a lista é o
      // que a pessoa veio ver.
    }
  }

  return { empresas, atualizadoEm: new Date().toISOString(), fonte: "acessorias" };
}

/** Lista de empresas, do cache se ainda estiver fresco. `forcar` ignora o cache. */
export async function listarEmpresas(forcar = false): Promise<RespostaEmpresas> {
  const c = g.__diarioCache;
  if (!forcar && c && Date.now() - c.em < CACHE_TTL_MS) return c.dados;
  // Duas abas pedindo ao mesmo tempo compartilham a mesma busca.
  if (c?.carregando) return c.carregando;

  const carregando = buscarTodas();
  g.__diarioCache = { ...(c ?? { dados: undefined as never, em: 0 }), carregando };
  try {
    const dados = await carregando;
    g.__diarioCache = { dados, em: Date.now() };
    return dados;
  } catch (e) {
    g.__diarioCache = c ? { dados: c.dados, em: c.em } : undefined;
    throw e;
  }
}

/** Uma empresa com dados frescos (1 requisição), atualizando o cache da lista. */
export async function buscarEmpresa(chave: string): Promise<RespostaEmpresa | null> {
  const digitos = chave.replace(/\D/g, "");

  if (modoDemo()) {
    const empresa = EMPRESAS_DEMO.find((e) => chaveEmpresa(e) === digitos);
    return empresa ? { empresa, atualizadoEm: new Date().toISOString(), fonte: "demo" } : null;
  }

  const [empresa] = comoLista(await chamar(`/companies/${digitos}/?${INCLUIR}`));
  if (!empresa) return null;

  const c = g.__diarioCache;
  if (c?.dados) {
    const i = c.dados.empresas.findIndex((e) => chaveEmpresa(e) === digitos);
    if (i >= 0) c.dados.empresas[i] = empresa;
  }
  return { empresa, atualizadoEm: new Date().toISOString(), fonte: "acessorias" };
}

export function mensagemDeErro(e: unknown): string {
  if (e instanceof ErroAcessorias) return e.message;
  return "Não foi possível falar com o Acessórias agora. Tente de novo em instantes.";
}

/**
 * Só confere se a empresa existe na carteira — sem trazer os dados dela.
 *
 * Existe para o atalho do Validador (`lib/integracao/vinculoDiario.ts`), que só
 * precisa saber se há par do outro lado. Usar a lista completa para isso
 * custava, no pior caso, a carteira inteira a cada página aberta dentro de uma
 * empresa. Uma requisição sem includes resolve em cerca de 200ms, e o resultado
 * ainda aproveita o cache da lista quando ele estiver quente.
 */
export async function empresaExiste(chave: string): Promise<boolean> {
  const digitos = chave.replace(/\D/g, "");
  if (!digitos) return false;

  if (modoDemo()) {
    return EMPRESAS_DEMO.some((e) => chaveEmpresa(e) === digitos);
  }

  const c = g.__diarioCache;
  if (c?.dados && Date.now() - c.em < CACHE_TTL_MS) {
    return c.dados.empresas.some((e) => chaveEmpresa(e) === digitos);
  }

  return comoLista(await chamar(`/companies/${digitos}/`)).length > 0;
}
