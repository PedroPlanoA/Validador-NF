import "server-only";

/**
 * Busca a carteira de empresas no Acessórias para preencher a aba
 * "Acessórias-Empresas" do arquivo do ICO Fiscal.
 *
 * É uma busca própria, separada da do Diário do Cliente (`lib/diario/
 * acessorias.ts`): aquela roda sem `includes` de propósito, porque só precisa
 * de nome e status para desenhar uma lista. Aqui o responsável de cada
 * departamento e os dados de cadastro são justamente o que interessa, então
 * vale pagar os includes.
 *
 * `ListAll` devolve 50 por página; lemos até vir uma página vazia.
 */
const BASE_URL = "https://api.acessorias.com";
const INCLUDES = "departments&registrationData";
const CONCORRENCIA = 6;
const MAX_PAGINAS = 80;
const ESPERA_429_MS = 6000;
const TENTATIVAS_429 = 4;

export interface EmpresaIco {
  id: string;
  cnpj: string;
  razao: string;
  fantasia: string;
  /** "Ativa" ou "Inativa", como o Acessórias devolve. */
  situacao: string;
  telefone: string;
  uf: string;
  regime: string;
  grupo: string;
  honorario: number | null;
  /** Datas em AAAA-MM-DD, ou null. */
  cadastro: string | null;
  clienteDesde: string | null;
  clienteAte: string | null;
  /** Nome do departamento (como no Acessórias) -> nome do responsável. */
  responsaveis: Record<string, string>;
}

interface EmpresaBruta {
  ID?: string;
  Identificador?: string;
  Razao?: string;
  Fantasia?: string;
  Status?: string;
  Telefone?: string;
  UF?: string;
  Regime?: string;
  GrupoDeEmpresas?: string;
  Honorario?: string;
  DataDoCadastro?: string;
  ClienteDesde?: string;
  ClienteAte?: string;
  Departamentos?: { ID?: string; Nome?: string; RespNome?: string }[];
}

export class ErroAcessorias extends Error {}

function token(): string {
  const t = process.env.ACESSORIAS_TOKEN?.trim();
  if (!t) throw new ErroAcessorias("ACESSORIAS_TOKEN não configurado — o arquivo não pode ser montado com os dados do Acessórias.");
  return t;
}

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
      throw new ErroAcessorias("Token do Acessórias inválido ou sem permissão.");
    }
    // 204 = sem conteúdo; é assim que a API sinaliza fim da paginação.
    if (res.status === 204 || res.status === 404) return null;
    if (!res.ok) throw new ErroAcessorias(`Acessórias respondeu HTTP ${res.status}.`);
    const texto = await res.text();
    if (!texto.trim()) return null;
    return JSON.parse(texto) as unknown;
  }
}

/** A data vazia do Acessórias vem como "0000-00-00" (ou string vazia). */
function data(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s || s.startsWith("0000")) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function numero(v: unknown): number | null {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function converter(e: EmpresaBruta): EmpresaIco {
  const responsaveis: Record<string, string> = {};
  for (const d of e.Departamentos ?? []) {
    const nome = String(d.Nome ?? "").trim();
    const resp = String(d.RespNome ?? "").trim();
    if (nome && resp) responsaveis[nome] = resp;
  }
  return {
    id: String(e.ID ?? "").trim(),
    cnpj: String(e.Identificador ?? "").trim(),
    razao: String(e.Razao ?? "").trim(),
    fantasia: String(e.Fantasia ?? "").trim(),
    situacao: String(e.Status ?? "").trim(),
    telefone: String(e.Telefone ?? "").trim(),
    uf: String(e.UF ?? "").trim(),
    regime: String(e.Regime ?? "").trim(),
    grupo: String(e.GrupoDeEmpresas ?? "").trim(),
    honorario: numero(e.Honorario),
    cadastro: data(e.DataDoCadastro),
    clienteDesde: data(e.ClienteDesde),
    clienteAte: data(e.ClienteAte),
    responsaveis,
  };
}

function comoLista(json: unknown): EmpresaBruta[] {
  if (!json) return [];
  if (Array.isArray(json)) return json as EmpresaBruta[];
  if (typeof json === "object" && "Identificador" in json) return [json as EmpresaBruta];
  return [];
}

/**
 * Toda a carteira — ativas e inativas. A aba de empresas é o cadastro
 * completo de propósito: a Base de Dados é que decide quem entra na análise,
 * filtrando por situação e pelas datas de entrada/saída dentro do período.
 */
export async function buscarEmpresas(): Promise<EmpresaIco[]> {
  const out: EmpresaIco[] = [];
  const vistas = new Set<string>();

  for (let inicio = 1; inicio <= MAX_PAGINAS; inicio += CONCORRENCIA) {
    const paginas = Array.from({ length: CONCORRENCIA }, (_, i) => inicio + i);
    const lotes = await Promise.all(
      paginas.map((p) => chamar(`/companies/ListAll/?${INCLUDES}&Pagina=${p}`).then(comoLista)),
    );

    let novas = 0;
    for (const lote of lotes) {
      for (const bruta of lote) {
        const chave = String(bruta.Identificador ?? bruta.ID ?? "");
        if (!chave || vistas.has(chave)) continue;
        vistas.add(chave);
        out.push(converter(bruta));
        novas++;
      }
    }
    // Nenhuma empresa nova em todo o lote: acabou a paginação.
    if (novas === 0) break;
  }

  return out;
}
