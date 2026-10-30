/**
 * ICO Fiscal — modelo de dados.
 *
 * Cada arquivo importado vira uma linha no banco (`IcoArquivo`): uma base de
 * ICO de um trimestre, ou um registro de obrigações. A importação lê a planilha
 * no navegador e guarda só o que o cálculo usa.
 */

/** Trimestre no formato `2026-T3`. */
export type Tri = string;

/** Teto de cada atividade no ICO. Ajuste aqui se a metodologia mudar. */
export const PESOS = [
  { campo: "ICO Regime", rotulo: "Regime", max: 0.5 },
  { campo: "ICO Entrada", rotulo: "Notas de entrada", max: 0.5 },
  { campo: "ICO Saída", rotulo: "Notas de saída", max: 2.0 },
  { campo: "ICO Serviços", rotulo: "Notas de serviço", max: 1.0 },
  { campo: "ICO Faturamento", rotulo: "Faturamento", max: 0.5 },
  { campo: "ICO Obrigações", rotulo: "Obrigações", max: 0.5 },
  { campo: "ICO Atendimento", rotulo: "Atendimentos", max: 0.5 },
] as const;

/** Obrigações cuja saída marca a empresa como "entregue" no mês. */
export const FOCO = ["DAS - Mensal", "DARF - COFINS"];

export interface EmpresaBase {
  id: string;
  nome: string;
  situacao: string;
  regime: string;
  honorarios: number;
  entradas: number;
  saidas: number;
  servicos: number;
  faturamento: number;
  obrigacoes: number;
  atendimento: number;
  comp: Record<string, number>;
  pontos: number;
  grau: number;
}

/** Base de ICO de um trimestre (uma linha por empresa). */
export interface BaseTri {
  tri: Tri;
  inicio: string | null;
  fim: string | null;
  empresas: EmpresaBase[];
}

/** Obrigação de referência (DAS / DARF-COFINS). Datas em `AAAA-MM-DD`. */
export interface ObrigacaoFoco {
  id: string;
  tarefa: string;
  empresa: string;
  fimmes: string;
  entrega: string | null;
  status: string;
  entregue: boolean;
  noPrazo: boolean;
  dispensada: boolean;
  resp: string;
  dono: string;
}

/** Voto de responsável: [id da empresa, trimestre da competência, "Responsável prazo", ocorrências]. */
export type Voto = [string, string, string, number];

export interface DadosObrigacoes {
  linhas: ObrigacaoFoco[];
  votos: Voto[];
  /** Total de linhas do arquivo, para o rodapé. */
  total: number;
}

interface ArquivoComum {
  id: string;
  nome: string;
  tag: string;
  detalhe: string;
  criadoEm: string;
}
export interface ArquivoBase extends ArquivoComum {
  tipo: "base";
  tri: Tri;
  dados: BaseTri;
}
export interface ArquivoObr extends ArquivoComum {
  tipo: "obr";
  tri: null;
  dados: DadosObrigacoes;
}
export type Arquivo = ArquivoBase | ArquivoObr;

/** Estado em memória, montado a partir dos arquivos guardados. */
export interface Obrigacao extends Omit<ObrigacaoFoco, "fimmes" | "entrega"> {
  fimmes: Date;
  entrega: Date | null;
  triComp: Tri;
}
export interface BaseMem extends BaseTri {
  mapa: Record<string, EmpresaBase>;
}
export interface DB {
  bases: Record<Tri, BaseMem>;
  obr: Obrigacao[];
  votos: Voto[];
  totalObr: number;
}
