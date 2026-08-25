import { parseNumber } from "@/lib/parsing/numberParser";

/**
 * Conversão da planilha de NFS-e do emissor nacional para os leiautes de
 * importação do Domínio.
 *
 * Dois modelos, escolhidos pelo usuário na tela:
 *
 * | | Entrada (serviços tomados) | Serviço (serviços prestados) |
 * |---|---|---|
 * | Cadastro | `0020`, 94 campos | `0010`, 94 campos (+ município IBGE) |
 * | Lançamento | `1000`, 94 campos | `3000`, **40** campos |
 * | CFOP | 1933 / 2933 | não existe |
 * | Série | sim | não existe |
 *
 * Função pura, sem DOM e sem leitura de arquivo — recebe as linhas já lidas da
 * planilha. É o que permite testar as regras (último dia útil, CFOP, formatação)
 * sem navegador, como em `lib/reconciliation` e `lib/split`.
 */

export type ModeloDominio = "ENTRADA" | "SERVICO";

/** O cadastro tem 94 campos nos dois modelos; o lançamento varia. */
const CAMPOS_CADASTRO = 94;
const CAMPOS_ENTRADA = 94;
const CAMPOS_SERVICO = 40;

/**
 * Colunas que cada modelo procura na planilha, com o nome exato.
 *
 * No modelo de **serviço** a contraparte é o tomador, não o prestador. Os nomes
 * abaixo são a expectativa; se o export do emissor nacional usar outros, a tela
 * diz quais faltaram — é melhor recusar com o nome da coluna do que gerar um TXT
 * com o documento errado.
 */
export const COLUNAS_POR_MODELO: Record<ModeloDominio, readonly string[]> = {
  ENTRADA: [
    "Número NFS-e",
    "Competência",
    "CNPJ/CPF Prestador",
    "Nome Prestador",
    "Valor do Serviço (R$)",
    "Município de Incidência",
  ],
  SERVICO: [
    "Número NFS-e",
    "Competência",
    "CNPJ/CPF Tomador",
    "Nome Tomador",
    "Valor do Serviço (R$)",
  ],
};

/** Campos comuns aos dois modelos. */
export interface ConfigComum {
  acumulador: string;
  especiePadrao: string;
}

export interface ConfigEntrada extends ConfigComum {
  ufTomador: string;
  seriePadrao: string;
}

export interface ConfigServico extends ConfigComum {
  /** Campo 20 do registro 3000 — código de serviço do município. */
  codigoServico: string;
  /** Campo 8 do cadastro 0010 — código IBGE do município. */
  municipioIbge: string;
  /** Campo 9 do cadastro 0010. */
  uf: string;
}

export interface ResultadoConversao {
  /** Conteúdo do TXT, pronto para download. */
  conteudo: string;
  notas: number;
  /** Cadastros gerados — prestadores no modelo de entrada, tomadores no de serviço. */
  cadastros: number;
  valorTotal: number;
  /** Linhas ignoradas por não ter número de nota ou documento da contraparte. */
  ignoradas: number;
  /** Notas sem competência legível — receberam a data padrão. Ver `DATA_PADRAO`. */
  semCompetencia: number;
  /** Só no modelo de entrada; no de serviço não existe CFOP. */
  cfopDentroDoEstado: number;
  cfopForaDoEstado: number;
  /** Colunas esperadas que não existem na planilha enviada. */
  colunasFaltando: string[];
}

/**
 * Data usada quando a competência não pode ser lida. Herdada da ferramenta
 * original, onde era um literal no meio do código.
 *
 * É um paliativo ruim: uma nota sem competência entra no TXT com uma data que
 * não tem nada a ver com ela. Por isso `semCompetencia` é devolvido e a tela
 * avisa quantas notas caíram aqui, em vez de deixar passar calado.
 */
export const DATA_PADRAO = "30/06/2026";

/** Excel guarda data como dias desde 30/12/1899. */
function deSerialExcel(serial: number): Date {
  return new Date(Date.UTC(1899, 11, 30) + serial * 86_400_000);
}

function doisDigitos(n: number): string {
  return String(n).padStart(2, "0");
}

function formatarBR(data: Date): string {
  return `${doisDigitos(data.getUTCDate())}/${doisDigitos(data.getUTCMonth() + 1)}/${data.getUTCFullYear()}`;
}

/**
 * Último dia **útil** do mês da competência, no formato DD/MM/AAAA. Vale para os
 * **dois** modelos — decisão do usuário.
 *
 * Sábado volta para sexta, domingo volta para sexta. Feriado não é considerado —
 * a ferramenta original também não considerava, e tratar feriado exigiria uma
 * tabela municipal que não existe aqui.
 *
 * Aceita "MM/AAAA" (o formato do emissor nacional), data completa do Excel e
 * número de série do Excel. Qualquer outra coisa devolve `null`, e quem chama
 * decide o que fazer.
 */
export function ultimoDiaUtil(competencia: unknown): string | null {
  if (competencia === null || competencia === undefined || competencia === "") return null;

  let ano: number | null = null;
  let mes: number | null = null;

  if (competencia instanceof Date) {
    ano = competencia.getUTCFullYear();
    mes = competencia.getUTCMonth() + 1;
  } else if (typeof competencia === "number" && Number.isFinite(competencia)) {
    const d = deSerialExcel(competencia);
    ano = d.getUTCFullYear();
    mes = d.getUTCMonth() + 1;
  } else {
    const texto = String(competencia).trim();
    // "07/2026" e também "31/07/2026" — nos dois casos o que importa é mês/ano.
    const mmAaaa = texto.match(/^(\d{1,2})\/(\d{4})$/);
    const ddMmAaaa = texto.match(/^\d{1,2}\/(\d{1,2})\/(\d{4})$/);
    if (mmAaaa) {
      mes = Number(mmAaaa[1]);
      ano = Number(mmAaaa[2]);
    } else if (ddMmAaaa) {
      mes = Number(ddMmAaaa[1]);
      ano = Number(ddMmAaaa[2]);
    }
  }

  if (!ano || !mes || mes < 1 || mes > 12) return null;

  // Dia 0 do mês seguinte = último dia deste mês.
  const data = new Date(Date.UTC(ano, mes, 0));
  const diaDaSemana = data.getUTCDay();
  if (diaDaSemana === 6) data.setUTCDate(data.getUTCDate() - 1);
  else if (diaDaSemana === 0) data.setUTCDate(data.getUTCDate() - 2);

  return formatarBR(data);
}

/** "São Paulo/SP" → "SP". Sem a barra, não há UF a extrair. */
export function ufDoMunicipio(municipio: unknown): string {
  const texto = String(municipio ?? "");
  if (!texto.includes("/")) return "";
  return texto.split("/")[1].trim().toUpperCase();
}

function valorBR(valor: number): string {
  return valor.toFixed(2).replace(".", ",");
}

export type LinhaPlanilha = Record<string, unknown>;

/** Uma linha da planilha já reduzida ao que os dois modelos precisam. */
interface NotaLida {
  numero: string;
  documento: string;
  nome: string;
  valor: number;
  data: string;
  temCompetencia: boolean;
  ufContraparte: string;
}

function lerLinhas(
  linhas: LinhaPlanilha[],
  colunaDocumento: string,
  colunaNome: string,
): { notas: NotaLida[]; ignoradas: number } {
  const notas: NotaLida[] = [];
  let ignoradas = 0;

  for (const linha of linhas) {
    const numero = String(linha["Número NFS-e"] ?? "").trim();
    const documento = String(linha[colunaDocumento] ?? "").replace(/\D/g, "");
    if (!numero || !documento) {
      ignoradas += 1;
      continue;
    }

    const bruto = linha["Valor do Serviço (R$)"];
    const data = ultimoDiaUtil(linha["Competência"]);

    notas.push({
      numero,
      documento,
      nome: String(linha[colunaNome] ?? "").trim(),
      valor: typeof bruto === "number" ? bruto : parseNumber(String(bruto ?? "")),
      data: data ?? DATA_PADRAO,
      temCompetencia: data !== null,
      ufContraparte: ufDoMunicipio(linha["Município de Incidência"]),
    });
  }

  return { notas, ignoradas };
}

function colunasFaltando(linhas: LinhaPlanilha[], modelo: ModeloDominio): string[] {
  const presentes = new Set(linhas.length > 0 ? Object.keys(linhas[0]) : []);
  return COLUNAS_POR_MODELO[modelo].filter((c) => !presentes.has(c));
}

/** Serviços **tomados** — cadastros `0020` e lançamentos `1000`. */
export function converterEntrada(linhas: LinhaPlanilha[], config: ConfigEntrada): ResultadoConversao {
  const acumulador = config.acumulador.trim();
  const ufTomador = config.ufTomador.trim().toUpperCase() || "SP";
  const serie = config.seriePadrao.trim() || "900";
  const especie = config.especiePadrao.trim() || "39";

  const { notas, ignoradas } = lerLinhas(linhas, "CNPJ/CPF Prestador", "Nome Prestador");

  const cadastros: string[] = [];
  const lancamentos: string[] = [];
  const vistos = new Set<string>();
  let valorTotal = 0;
  let semCompetencia = 0;
  let cfopDentroDoEstado = 0;
  let cfopForaDoEstado = 0;

  for (const nota of notas) {
    if (!nota.temCompetencia) semCompetencia += 1;

    // Dentro do estado do tomador (ou UF do prestador desconhecida) é 1933;
    // fora do estado, 2933.
    const dentroDoEstado = nota.ufContraparte === ufTomador || nota.ufContraparte === "";
    if (dentroDoEstado) cfopDentroDoEstado += 1;
    else cfopForaDoEstado += 1;

    if (!vistos.has(nota.documento)) {
      vistos.add(nota.documento);
      const c = new Array(CAMPOS_CADASTRO).fill("");
      c[0] = "0020";
      c[1] = nota.documento;
      c[2] = nota.nome;
      c[3] = nota.nome;
      c[9] = nota.ufContraparte;
      c[21] = "N";
      c[23] = "O";
      c[24] = "N";
      c[30] = "N";
      cadastros.push(c.join("|"));
    }

    const l = new Array(CAMPOS_ENTRADA).fill("");
    l[0] = "1000";
    l[1] = especie;
    l[2] = nota.documento;
    l[3] = ""; // Inscrição estadual fica vazia de propósito.
    l[4] = acumulador;
    l[5] = dentroDoEstado ? "1933" : "2933";
    l[7] = nota.numero;
    l[8] = serie;
    l[10] = nota.data; // Data de emissão
    l[11] = nota.data; // Data de entrada
    l[12] = valorBR(nota.valor);
    l[15] = "S"; // Gera EFD
    l[38] = valorBR(nota.valor); // Base de cálculo
    lancamentos.push(l.join("|"));

    valorTotal += nota.valor;
  }

  return montar(cadastros, lancamentos, {
    notas: lancamentos.length,
    cadastros: vistos.size,
    valorTotal,
    ignoradas,
    semCompetencia,
    cfopDentroDoEstado,
    cfopForaDoEstado,
    colunasFaltando: colunasFaltando(linhas, "ENTRADA"),
  });
}

/** Serviços **prestados** — cadastros `0010` e lançamentos `3000`. */
export function converterServico(linhas: LinhaPlanilha[], config: ConfigServico): ResultadoConversao {
  const acumulador = config.acumulador.trim();
  const especie = config.especiePadrao.trim() || "39";
  const codigoServico = config.codigoServico.trim();
  const municipioIbge = config.municipioIbge.trim();
  const uf = config.uf.trim().toUpperCase();

  const { notas, ignoradas } = lerLinhas(linhas, "CNPJ/CPF Tomador", "Nome Tomador");

  const cadastros: string[] = [];
  const lancamentos: string[] = [];
  const vistos = new Set<string>();
  let valorTotal = 0;
  let semCompetencia = 0;

  for (const nota of notas) {
    if (!nota.temCompetencia) semCompetencia += 1;

    if (!vistos.has(nota.documento)) {
      vistos.add(nota.documento);
      const c = new Array(CAMPOS_CADASTRO).fill("");
      c[0] = "0010";
      c[1] = nota.documento;
      c[2] = nota.nome;
      c[3] = nota.nome;
      c[8] = municipioIbge;
      c[9] = uf;
      c[21] = "N";
      c[23] = "O";
      c[24] = "N";
      // No 0010 este marcador fica no campo 29 — no 0020 do outro modelo é o 30.
      c[29] = "N";
      cadastros.push(c.join("|"));
    }

    const l = new Array(CAMPOS_SERVICO).fill("");
    l[0] = "3000";
    l[1] = especie;
    l[2] = nota.documento;
    l[3] = ""; // Inscrição estadual
    l[4] = acumulador;
    l[5] = "0";
    l[6] = nota.numero;
    l[9] = nota.data; // Data de emissão
    l[10] = nota.data; // Data de entrada
    l[11] = valorBR(nota.valor);
    l[19] = "0";
    l[20] = codigoServico;
    l[28] = valorBR(nota.valor); // Base de cálculo
    lancamentos.push(l.join("|"));

    valorTotal += nota.valor;
  }

  return montar(cadastros, lancamentos, {
    notas: lancamentos.length,
    cadastros: vistos.size,
    valorTotal,
    ignoradas,
    semCompetencia,
    cfopDentroDoEstado: 0,
    cfopForaDoEstado: 0,
    colunasFaltando: colunasFaltando(linhas, "SERVICO"),
  });
}

/** Cadastros antes dos lançamentos: o Domínio precisa da pessoa existindo antes
 *  da nota que a referencia. */
function montar(
  cadastros: string[],
  lancamentos: string[],
  resto: Omit<ResultadoConversao, "conteudo">,
): ResultadoConversao {
  return { conteudo: [...cadastros, ...lancamentos].join("\r\n"), ...resto };
}
