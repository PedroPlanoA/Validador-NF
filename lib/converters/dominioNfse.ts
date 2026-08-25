import { parseNumber } from "@/lib/parsing/numberParser";

/**
 * Conversão da planilha de NFS-e do emissor nacional (serviços **tomados**) para
 * o leiaute de importação do Domínio.
 *
 * Função pura, sem DOM e sem leitura de arquivo — recebe as linhas já lidas da
 * planilha. É o que permite testar as regras (último dia útil, CFOP, formatação)
 * sem navegador, do mesmo jeito que `lib/reconciliation` e `lib/split`.
 */

/** Colunas que a planilha do emissor nacional precisa ter, com o nome exato. */
export const COLUNAS_ESPERADAS = [
  "Número NFS-e",
  "Competência",
  "CNPJ/CPF Prestador",
  "Nome Prestador",
  "Valor do Serviço (R$)",
  "Município de Incidência",
] as const;

/** O leiaute do Domínio tem 94 campos por linha, separados por `|`. */
const TOTAL_CAMPOS = 94;

export interface ConversaoConfig {
  acumulador: string;
  ufTomador: string;
  seriePadrao: string;
  especiePadrao: string;
}

export interface ResultadoConversao {
  /** Conteúdo do TXT, pronto para download. */
  conteudo: string;
  notas: number;
  prestadores: number;
  valorTotal: number;
  /** Linhas ignoradas por não ter número de nota ou CNPJ do prestador. */
  ignoradas: number;
  /** Notas sem competência legível — receberam a data padrão. Ver `DATA_PADRAO`. */
  semCompetencia: number;
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
 * Último dia **útil** do mês da competência, no formato DD/MM/AAAA.
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

export function converterParaDominio(
  linhas: LinhaPlanilha[],
  config: ConversaoConfig,
): ResultadoConversao {
  const acumulador = config.acumulador.trim();
  const ufTomador = config.ufTomador.trim().toUpperCase() || "SP";
  const serie = config.seriePadrao.trim() || "900";
  const especie = config.especiePadrao.trim() || "39";

  const presentes = new Set(linhas.length > 0 ? Object.keys(linhas[0]) : []);
  const colunasFaltando = COLUNAS_ESPERADAS.filter((c) => !presentes.has(c));

  const linhas0020: string[] = [];
  const linhas1000: string[] = [];
  const prestadores = new Set<string>();

  let ignoradas = 0;
  let semCompetencia = 0;
  let valorTotal = 0;
  let cfopDentroDoEstado = 0;
  let cfopForaDoEstado = 0;

  for (const linha of linhas) {
    const numeroNota = String(linha["Número NFS-e"] ?? "").trim();
    const cnpjCpf = String(linha["CNPJ/CPF Prestador"] ?? "").replace(/\D/g, "");
    if (!numeroNota || !cnpjCpf) {
      ignoradas += 1;
      continue;
    }

    const nomePrestador = String(linha["Nome Prestador"] ?? "").trim();
    const bruto = linha["Valor do Serviço (R$)"];
    const valor = typeof bruto === "number" ? bruto : parseNumber(String(bruto ?? ""));
    const ufPrestador = ufDoMunicipio(linha["Município de Incidência"]);

    const data = ultimoDiaUtil(linha["Competência"]);
    if (data === null) semCompetencia += 1;
    const dataFormatada = data ?? DATA_PADRAO;

    // Dentro do estado do tomador (ou UF do prestador desconhecida) é 1933;
    // fora do estado, 2933.
    const dentroDoEstado = ufPrestador === ufTomador || ufPrestador === "";
    if (dentroDoEstado) cfopDentroDoEstado += 1;
    else cfopForaDoEstado += 1;

    if (!prestadores.has(cnpjCpf)) {
      prestadores.add(cnpjCpf);
      const campos = new Array(TOTAL_CAMPOS).fill("");
      campos[0] = "0020";
      campos[1] = cnpjCpf;
      campos[2] = nomePrestador;
      campos[3] = nomePrestador;
      campos[9] = ufPrestador;
      campos[21] = "N";
      campos[23] = "O";
      campos[24] = "N";
      campos[30] = "N";
      linhas0020.push(campos.join("|"));
    }

    const campos = new Array(TOTAL_CAMPOS).fill("");
    campos[0] = "1000";
    campos[1] = especie;
    campos[2] = cnpjCpf;
    campos[3] = ""; // Inscrição estadual fica vazia de propósito.
    campos[4] = acumulador;
    campos[5] = dentroDoEstado ? "1933" : "2933";
    campos[7] = numeroNota;
    campos[8] = serie;
    campos[10] = dataFormatada; // Data de emissão
    campos[11] = dataFormatada; // Data de entrada
    campos[12] = valorBR(valor);
    campos[15] = "S"; // Gera EFD
    campos[38] = valorBR(valor); // Base de cálculo
    linhas1000.push(campos.join("|"));

    valorTotal += valor;
  }

  return {
    // Cadastros (0020) antes dos lançamentos (1000): o Domínio precisa do
    // prestador existindo antes da nota que o referencia.
    conteudo: [...linhas0020, ...linhas1000].join("\r\n"),
    notas: linhas1000.length,
    prestadores: prestadores.size,
    valorTotal,
    ignoradas,
    semCompetencia,
    cfopDentroDoEstado,
    cfopForaDoEstado,
    colunasFaltando: [...colunasFaltando],
  };
}
