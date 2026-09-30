import type { EmpresaAcessorias } from "./tipos";

/**
 * Catálogo dos campos que podem aparecer na ficha do cliente.
 *
 * Os campos conhecidos da API do Acessórias têm rótulo, grupo e formato
 * definidos aqui. Qualquer chave que a API devolver e que não esteja no
 * catálogo entra automaticamente no grupo "Outros campos" (ver
 * `catalogoCompleto`), então a configuração nunca fica desatualizada.
 */
export type TipoCampo = "texto" | "data" | "dinheiro" | "telefone" | "status" | "documento" | "lista";

export interface ColunaLista {
  chave: string;
  rotulo: string;
  tipo?: Exclude<TipoCampo, "lista">;
  numerico?: boolean;
}

export interface Campo {
  chave: string;
  rotulo: string;
  grupo: GrupoCampo;
  tipo: TipoCampo;
  /** Só para `tipo: "lista"`: colunas da tabela. */
  colunas?: ColunaLista[];
}

export const GRUPOS = ["Cadastro", "Tributário", "Relacionamento", "Listas", "Outros campos"] as const;
export type GrupoCampo = (typeof GRUPOS)[number];

export const CATALOGO: Campo[] = [
  { chave: "ID", rotulo: "Código (ID Acessórias)", grupo: "Cadastro", tipo: "texto" },
  { chave: "Identificador", rotulo: "CNPJ / CPF", grupo: "Cadastro", tipo: "documento" },
  { chave: "Razao", rotulo: "Razão social", grupo: "Cadastro", tipo: "texto" },
  { chave: "Fantasia", rotulo: "Nome fantasia", grupo: "Cadastro", tipo: "texto" },
  { chave: "Status", rotulo: "Situação", grupo: "Cadastro", tipo: "status" },
  { chave: "UF", rotulo: "UF", grupo: "Cadastro", tipo: "texto" },
  { chave: "Telefone", rotulo: "Telefone", grupo: "Cadastro", tipo: "telefone" },
  { chave: "DataDoCadastro", rotulo: "Data do cadastro", grupo: "Cadastro", tipo: "data" },
  { chave: "DtLastDH", rotulo: "Última alteração no Acessórias", grupo: "Cadastro", tipo: "texto" },

  { chave: "Regime", rotulo: "Regime tributário", grupo: "Tributário", tipo: "texto" },
  { chave: "GrupoDeEmpresas", rotulo: "Grupo de empresas", grupo: "Tributário", tipo: "texto" },

  { chave: "ClienteDesde", rotulo: "Cliente desde", grupo: "Relacionamento", tipo: "data" },
  { chave: "ClienteAte", rotulo: "Cliente até", grupo: "Relacionamento", tipo: "data" },
  { chave: "Honorario", rotulo: "Honorário", grupo: "Relacionamento", tipo: "dinheiro" },

  {
    chave: "Departamentos",
    rotulo: "Responsáveis por departamento",
    grupo: "Listas",
    tipo: "lista",
    colunas: [
      { chave: "Nome", rotulo: "Departamento" },
      { chave: "RespNome", rotulo: "Responsável" },
      { chave: "RespEmail", rotulo: "E-mail" },
    ],
  },
  {
    chave: "ContatosNaEmpresa",
    rotulo: "Contatos na empresa",
    grupo: "Listas",
    tipo: "lista",
    colunas: [
      { chave: "Nome", rotulo: "Nome" },
      { chave: "E-mail", rotulo: "E-mail" },
      { chave: "Celular", rotulo: "Celular", tipo: "telefone" },
    ],
  },
  {
    chave: "InscricoesEstaduais",
    rotulo: "Inscrições estaduais",
    grupo: "Listas",
    tipo: "lista",
    colunas: [
      { chave: "UF", rotulo: "UF" },
      { chave: "IE", rotulo: "Inscrição estadual" },
    ],
  },
  {
    chave: "Obrigacoes",
    rotulo: "Obrigações",
    grupo: "Listas",
    tipo: "lista",
    // Só o nome. Entregues, atrasadas e as projeções de 30 dias são o painel de
    // produção do Acessórias, não o que se quer saber ao abrir a ficha de um
    // cliente — ali a pergunta é "o que esta empresa entrega", não "quantas".
    colunas: [{ chave: "Nome", rotulo: "Obrigação" }],
  },
];

/** O que aparece na ficha antes de alguém mexer na configuração. */
export const CAMPOS_PADRAO = [
  "Identificador",
  "Fantasia",
  "Status",
  "Regime",
  "UF",
  "Telefone",
  "ClienteDesde",
  "GrupoDeEmpresas",
  "Departamentos",
  "ContatosNaEmpresa",
];

function rotuloDeChave(chave: string): string {
  // "DataDeAbertura" → "Data De Abertura"
  return chave.replace(/([a-zà-ú])([A-Z])/g, "$1 $2").replace(/_/g, " ");
}

/** Catálogo + qualquer campo extra encontrado nas empresas carregadas. */
export function catalogoCompleto(empresas: EmpresaAcessorias[]): Campo[] {
  const conhecidas = new Set(CATALOGO.map((c) => c.chave));
  const extras = new Map<string, Campo>();
  for (const e of empresas) {
    for (const [chave, valor] of Object.entries(e)) {
      if (conhecidas.has(chave) || extras.has(chave)) continue;
      if (Array.isArray(valor)) {
        const primeiro = valor.find((v) => v && typeof v === "object") as Record<string, unknown> | undefined;
        extras.set(chave, {
          chave,
          rotulo: rotuloDeChave(chave),
          grupo: "Outros campos",
          tipo: "lista",
          colunas: primeiro ? Object.keys(primeiro).map((k) => ({ chave: k, rotulo: rotuloDeChave(k) })) : [],
        });
      } else if (valor === null || typeof valor !== "object") {
        extras.set(chave, { chave, rotulo: rotuloDeChave(chave), grupo: "Outros campos", tipo: "texto" });
      }
    }
  }
  return [...CATALOGO, ...extras.values()];
}

// ─── Formatação ─────────────────────────────────────────────────────────────

const DATA_VAZIA = /^0{4}-0{2}-0{2}/;

export function formatarValor(valor: unknown, tipo: TipoCampo | undefined): string {
  if (valor === null || valor === undefined) return "";
  const s = String(valor).trim();
  if (!s) return "";

  switch (tipo) {
    case "data": {
      if (DATA_VAZIA.test(s)) return "";
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
    }
    case "dinheiro": {
      const n = Number(s.replace(",", "."));
      return Number.isFinite(n) ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : s;
    }
    case "telefone": {
      const d = s.replace(/\D/g, "");
      if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
      if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
      return s;
    }
    case "documento": {
      const d = s.replace(/\D/g, "");
      if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
      if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
      return s;
    }
    default:
      return s;
  }
}

export function statusAtivo(status: unknown): boolean {
  return /^ativ/i.test(String(status ?? "").trim());
}
