/**
 * Formato de uma empresa como a API do Acessórias devolve em
 * `GET /companies/{Identificador}` (e em cada item de `ListAll`).
 *
 * Os campos são tipados de forma aberta de propósito: a API pode ganhar campos
 * novos, e o catálogo de campos da ficha (`campos.ts`) descobre qualquer chave
 * extra sozinho — ela aparece na configuração sem precisar mexer no código.
 */
export interface EmpresaAcessorias {
  ID?: string;
  Identificador: string;
  Razao?: string;
  Fantasia?: string;
  Status?: string;
  Telefone?: string;
  UF?: string;
  ClienteDesde?: string;
  ClienteAte?: string;
  Honorario?: string;
  DataDoCadastro?: string;
  DtLastDH?: string;
  Regime?: string;
  GrupoDeEmpresas?: string;
  InscricoesEstaduais?: { IE?: string; UF?: string }[];
  ContatosNaEmpresa?: Record<string, string>[];
  Departamentos?: { ID?: string; Nome?: string; RespNome?: string; RespEmail?: string }[];
  Obrigacoes?: {
    Nome?: string;
    Status?: string;
    Entregues?: string;
    Atrasadas?: string;
    Proximos30D?: string;
    "Futuras30+"?: string;
  }[];
  [campo: string]: unknown;
}

export interface RespostaEmpresas {
  empresas: EmpresaAcessorias[];
  /** ISO — quando os dados foram buscados no Acessórias. */
  atualizadoEm: string;
  /** `demo` quando não há token configurado e os dados são de exemplo. */
  fonte: "acessorias" | "demo";
}

export interface RespostaEmpresa {
  empresa: EmpresaAcessorias;
  atualizadoEm: string;
  fonte: "acessorias" | "demo";
}

/** Só dígitos do CNPJ/CPF — é assim que a empresa aparece na URL da ficha. */
export function chaveEmpresa(e: Pick<EmpresaAcessorias, "Identificador">): string {
  return String(e.Identificador ?? "").replace(/\D/g, "");
}

export function nomeEmpresa(e: EmpresaAcessorias): string {
  return (e.Razao || e.Fantasia || e.Identificador || "Sem nome").trim();
}
