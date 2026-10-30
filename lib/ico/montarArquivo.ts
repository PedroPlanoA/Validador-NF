import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import type { EmpresaIco } from "./acessorias";

/**
 * Monta o arquivo da base do ICO a partir do modelo, já com a aba
 * "Acessórias-Empresas" preenchida pela API e o período gravado na
 * "Base de Dados".
 *
 * O arquivo é editado **no XML**, não reescrito com uma biblioteca de
 * planilha. Reescrever destruiria o que o modelo tem de valioso: a matriz
 * dinâmica `UNIQUE/FILTER` da coluna D da Base de Dados e as fórmulas de
 * cada coluna de ICO. Aqui só trocamos a aba de empresas inteira e duas
 * células de período; todo o resto do pacote fica byte a byte igual.
 */

const MODELO = path.join(process.cwd(), "public", "modelos", "modelo-dados-ico-fiscal.xlsx");

/** sheet2 = "Acessórias-Empresas", sheet3 = "Base de Dados" (ver xl/workbook.xml). */
const ABA_EMPRESAS = "xl/worksheets/sheet2.xml";
const ABA_BASE = "xl/worksheets/sheet3.xml";

/** Estilos herdados do modelo: 1 = data, 5 = as fórmulas de fim de mês. */
const ESTILO_DATA = 1;
const ESTILO_FIMMES = 5;

const escapar = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Data AAAA-MM-DD para o serial do Excel (dias desde 1899-12-30). */
function serial(iso: string | null): number | null {
  if (!iso) return null;
  const [a, m, d] = iso.split("-").map(Number);
  if (!a || !m || !d) return null;
  return Math.round((Date.UTC(a, m - 1, d) - Date.UTC(1899, 11, 30)) / 86_400_000);
}

function coluna(indice: number): string {
  let n = indice;
  let s = "";
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

type Valor = { tipo: "texto"; v: string } | { tipo: "numero"; v: number } | { tipo: "data"; v: string | null } | null;

/** Cabeçalhos das colunas de departamento, na ordem AH..AR do modelo. */
const DEPARTAMENTOS = [
  "01 - DPTO PESSOAL",
  "02 - DPTO FISCAL",
  "BPO FISCAL",
  "03 - DPTO CONTABIL",
  "RESULTADO MENSAL",
  "RESULTADOS TRIMESTRAIS",
  "04 - DPTO SOCIETARIO",
  "06 - FINANCEIRO",
  "07 - COMERCIAL",
  "08 - GERÊNCIA",
  "11 - CONTABIL - ASSISTENTE",
];

/** Uma linha da aba, na ordem exata das 44 colunas (A..AR) do modelo. */
function valoresDaLinha(e: EmpresaIco): Valor[] {
  const v: Valor[] = new Array(44).fill(null);
  v[2] = { tipo: "texto", v: e.razao }; // C Razão social
  v[3] = e.id ? { tipo: "numero", v: Number(e.id) } : null; // D ID
  v[4] = { tipo: "texto", v: e.cnpj }; // E CNPJ
  v[5] = { tipo: "texto", v: e.telefone }; // F Fone
  v[6] = { tipo: "texto", v: e.regime }; // G Regime
  v[7] = { tipo: "texto", v: e.fantasia }; // H Nome fantasia
  v[17] = { tipo: "texto", v: e.uf }; // R UF
  v[18] = { tipo: "data", v: e.cadastro }; // S Cadastro
  // T (Data de abertura) fica vazia: a API não expõe esse campo. A coluna A
  // só recorre a ela quando "Cli. desde" falta, o que é raro.
  v[20] = { tipo: "data", v: e.clienteDesde }; // U Cli. desde
  v[21] = { tipo: "data", v: e.clienteAte }; // V Cli. até
  v[22] = { tipo: "texto", v: e.situacao }; // W Ativa?
  v[24] = e.honorario != null ? { tipo: "numero", v: e.honorario } : null; // Y Honorários
  v[27] = { tipo: "texto", v: e.grupo }; // AB Grupo de Empresas
  DEPARTAMENTOS.forEach((nome, i) => {
    const resp = e.responsaveis[nome];
    if (resp) v[33 + i] = { tipo: "texto", v: resp };
  });
  return v;
}

function celula(ref: string, valor: Valor): string {
  if (!valor) return "";
  if (valor.tipo === "texto") {
    if (!valor.v) return "";
    return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapar(valor.v)}</t></is></c>`;
  }
  if (valor.tipo === "numero") {
    if (!Number.isFinite(valor.v)) return "";
    return `<c r="${ref}"><v>${valor.v}</v></c>`;
  }
  const s = serial(valor.v);
  if (s == null) return "";
  return `<c r="${ref}" s="${ESTILO_DATA}"><v>${s}</v></c>`;
}

function linhaXml(e: EmpresaIco, r: number): string {
  const celulas = [
    // A e B são as fórmulas de fim de mês do próprio modelo, reescritas por
    // linha. Vão sem <v>: o Excel calcula ao abrir (fullCalcOnLoad).
    //
    // A ordem original é "Cli. desde, ou Data de abertura". A API não expõe a
    // data de abertura, e 239 das 427 empresas não têm "Cli. desde" — das
    // quais 129 entrariam na análise. Sem um terceiro nível elas ficariam sem
    // data e o filtro da Base de Dados (entrada <= fim do período) as cortaria.
    //
    // O Cadastro entra como último recurso, mas **limitado ao início do
    // período**: ele diz quando a empresa foi cadastrada no Acessórias, não
    // quando passou a ser cliente, e pode ser muito posterior — há empresa
    // aberta em 2019 e cadastrada em 2025. Sem o MIN, o Cadastro jogava 20
    // empresas para fora do trimestre. Com ele, a falta do dado nunca exclui
    // ninguém nem encurta a "Atividade Empresa", que é o que se quer: a
    // empresa tem obrigações no período, logo já era cliente nele.
    `<c r="A${r}" s="${ESTILO_FIMMES}"><f>EOMONTH(IF(U${r}&lt;&gt;"",U${r},IF(T${r}&lt;&gt;"",T${r},MIN(S${r},'Base de Dados'!$B$2))),0)</f></c>`,
    `<c r="B${r}" s="${ESTILO_FIMMES}"><f>IFERROR(EOMONTH(IF(W${r}="Ativa","",V${r}),0),"-")</f></c>`,
  ];
  const vals = valoresDaLinha(e);
  for (let i = 2; i < vals.length; i++) {
    const c = celula(`${coluna(i)}${r}`, vals[i]);
    if (c) celulas.push(c);
  }
  return `<row r="${r}" spans="1:44">${celulas.join("")}</row>`;
}

/** Troca o valor de uma célula que guarda data (B2/B3 do período). */
function gravarData(xml: string, ref: string, iso: string): string {
  const s = serial(iso);
  if (s == null) return xml;
  const re = new RegExp(`<c r="${ref}"([^>]*)>(?:<f[^>]*\\/>|<f[^>]*>[\\s\\S]*?<\\/f>)?(?:<v>[^<]*<\\/v>)?<\\/c>`);
  if (re.test(xml)) {
    return xml.replace(re, (_m, attrs: string) => {
      const semTipo = attrs.replace(/\st="[^"]*"/, "");
      return `<c r="${ref}"${semTipo}><v>${s}</v></c>`;
    });
  }
  return xml;
}

export interface ArquivoMontado {
  buffer: Buffer;
  empresas: number;
  semClienteDesde: number;
}

export async function montarArquivoBase(
  empresas: EmpresaIco[],
  periodo: { inicio: string; fim: string },
): Promise<ArquivoMontado> {
  const zip = await JSZip.loadAsync(await readFile(MODELO));

  // --- aba de empresas: mantém o cabeçalho do modelo, troca os dados ---
  const origem = await zip.file(ABA_EMPRESAS)!.async("string");
  const cabecalho = origem.match(/<row r="1"[\s\S]*?<\/row>/)?.[0];
  if (!cabecalho) throw new Error("Modelo inesperado: não achei o cabeçalho da aba de empresas.");

  const linhas = empresas.map((e, i) => linhaXml(e, i + 2)).join("");
  const ultima = empresas.length + 1;

  let novoEmpresas = origem.replace(
    /<sheetData>[\s\S]*?<\/sheetData>/,
    `<sheetData>${cabecalho}${linhas}</sheetData>`,
  );
  novoEmpresas = novoEmpresas.replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="A1:AR${Math.max(ultima, 1)}"/>`);
  zip.file(ABA_EMPRESAS, novoEmpresas);

  // --- período na Base de Dados (B2 = início, B3 = fim) ---
  let base = await zip.file(ABA_BASE)!.async("string");
  base = gravarData(base, "B2", periodo.inicio);
  base = gravarData(base, "B3", periodo.fim);
  zip.file(ABA_BASE, base);

  // --- o Excel recalcula tudo ao abrir ---
  let wb = await zip.file("xl/workbook.xml")!.async("string");
  wb = wb.includes("fullCalcOnLoad")
    ? wb
    : wb.replace(/<calcPr([^>]*)\/>/, (_m, a: string) => `<calcPr${a} fullCalcOnLoad="1"/>`);
  zip.file("xl/workbook.xml", wb);

  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return {
    buffer,
    empresas: empresas.length,
    semClienteDesde: empresas.filter((e) => !e.clienteDesde).length,
  };
}
