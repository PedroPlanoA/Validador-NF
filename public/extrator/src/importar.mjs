// Leitura da planilha de lançamentos que o escritório exporta do sistema contábil.
//
// Três formatos são aceitos, porque é isso que aparece na prática:
//
//   .csv  — texto, com separador e codificação detectados
//   .xlsx — planilha do Excel
//   .csv  "do sistema" — apesar da extensão, é um binário de ClientDataSet (Delphi),
//           que é como o sistema contábil exporta. O leitor abaixo entende esse
//           formato; ver decodificarClientDataSet().
//
// O que precisa sair daqui, sempre: o número do documento e o valor contábil.

import ExcelJS from 'exceljs';

/** Nome de coluna sem acento, espaço nem maiúscula — para casar cabeçalhos. */
const chave = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/** Aceita "1.234,56", "1234.56" e "1234,56" — os três aparecem nos exports. */
export function numeroBR(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  let s = String(v ?? '').trim();
  if (!s) return 0;
  s = s.replace(/[R$\s]/g, '');
  // Com vírgula e ponto juntos, o último separador é o decimal.
  if (s.includes(',') && s.includes('.')) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

/** Só os dígitos — o número da nota é comparado como texto sem zeros à esquerda. */
export const soNumero = (v) => String(v ?? '').replace(/\D/g, '').replace(/^0+(?=\d)/, '');

// ──────────────────────────────────────────────────────────────────────────────
// ClientDataSet binário (o ".csv" que o sistema contábil gera)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Decodifica o pacote binário do ClientDataSet.
 *
 * O arquivo tem duas partes. Primeiro os descritores de campo, cada um marcado por
 * 0x7A seguido do tamanho e do nome. Depois os valores, num encadeado de blocos:
 *
 *   tipo:2  tamanho:2  nºDaLinha:2  índiceDoCampo:2  00 00 00  valor(tamanho-7)
 *
 * Campo nulo simplesmente não aparece — é por isso que os registros têm tamanhos
 * diferentes. Um registro novo começa quando o índice do campo deixa de crescer.
 *
 * O índice do bloco é a posição do descritor na ordem em que ele aparece, conferido
 * campo a campo contra os valores: índice 19 trouxe "SOFIA OLIVEIRA RIBEIRO" em
 * `nome_cliente`, 20 trouxe "SP" em `uf_cliente` e 26 o nome da empresa.
 *
 * Conferência do arquivo inteiro: 420 registros lidos e apenas 474 bytes dos 328 mil
 * não reconhecidos (o cabeçalho). É o que dá confiança de que a leitura está certa —
 * decodificação errada desalinha e deixa lixo para trás.
 */
function decodificarClientDataSet(b) {
  // 1) Descritores, na ordem em que aparecem.
  const campos = [];
  for (let i = 0; i < b.length && campos.length < 200; i++) {
    if (b[i] !== 0x7a) continue;
    const n = b[i + 1];
    if (n < 2 || n > 60) continue;
    const nome = b.toString('latin1', i + 2, i + 2 + n);
    if (!/^[a-z_][a-z0-9_]*$/.test(nome)) continue;
    if (b[i + 2 + n] !== 0x24) continue; // '$' fecha o nome
    campos.push(nome);
  }
  if (campos.length === 0) return null;

  // 2) Blocos de valor.
  const linhas = [];
  let atual = null;
  let ultimoIndice = -1;

  for (let p = 0; p + 4 <= b.length; ) {
    const tipo = b.readUInt16LE(p);
    const tam = b.readUInt16LE(p + 2);

    // Bloco plausível? Se não, anda um byte — o começo do arquivo é cabeçalho.
    if ((tipo !== 3 && tipo !== 4) || tam < 8 || p + 4 + tam > b.length) {
      p++;
      continue;
    }

    const indice = b.readUInt16LE(p + 6);
    const inicioValor = p + 11;
    const tamValor = tam - 7;

    const nome = campos[indice];
    if (!nome) {
      p++;
      continue;
    }

    let valor;
    if (tipo === 3) {
      if (tamValor !== 8) { p++; continue; }
      valor = b.readDoubleLE(inicioValor);
    } else {
      const compr = b[inicioValor];
      if (compr !== tamValor - 1) { p++; continue; }
      valor = b.toString('latin1', inicioValor + 1, inicioValor + 1 + compr);
    }

    if (indice <= ultimoIndice || atual === null) {
      atual = {};
      linhas.push(atual);
    }
    atual[nome] = valor;
    ultimoIndice = indice;

    p += 4 + tam;
  }

  return linhas.length ? linhas : null;
}

// ──────────────────────────────────────────────────────────────────────────────
// CSV e XLSX
// ──────────────────────────────────────────────────────────────────────────────

function lerCsv(texto) {
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim());
  if (linhas.length < 2) return null;

  // Separador: o que mais aparece no cabeçalho entre ; , e tabulação.
  const sep = [';', ',', '\t']
    .map((s) => [s, linhas[0].split(s).length])
    .sort((a, b) => b[1] - a[1])[0][0];

  const partir = (l) => l.split(sep).map((c) => c.trim().replace(/^"(.*)"$/, '$1'));
  const cabecalho = partir(linhas[0]);

  return linhas.slice(1).map((l) => {
    const celulas = partir(l);
    const obj = {};
    cabecalho.forEach((c, i) => {
      obj[c] = celulas[i] ?? '';
    });
    return obj;
  });
}

async function lerXlsx(buffer) {
  const livro = new ExcelJS.Workbook();
  await livro.xlsx.load(buffer);
  const aba = livro.worksheets[0];
  if (!aba) return null;

  const cabecalho = (aba.getRow(1).values ?? []).slice(1).map((v) => String(v ?? ''));
  const linhas = [];
  aba.eachRow((linha, i) => {
    if (i === 1) return;
    const celulas = (linha.values ?? []).slice(1);
    const obj = {};
    cabecalho.forEach((c, j) => {
      const v = celulas[j];
      obj[c] = v && typeof v === 'object' && 'result' in v ? v.result : v ?? '';
    });
    linhas.push(obj);
  });
  return linhas.length ? linhas : null;
}

// ──────────────────────────────────────────────────────────────────────────────

/** As colunas que interessam, com os apelidos que já apareceram nos exports. */
const COLUNA_DOCUMENTO = ['documentoinicial', 'documento', 'numerodocumento', 'numero', 'numnota', 'nfnumero'];
const COLUNA_VALOR = ['valorcontabil', 'valor', 'valortotal', 'valornota'];

function acharColuna(linhas, candidatos) {
  const presentes = new Map(Object.keys(linhas[0] ?? {}).map((k) => [chave(k), k]));
  for (const c of candidatos) if (presentes.has(c)) return presentes.get(c);
  return null;
}

/**
 * Lê o arquivo e devolve os lançamentos: `{ documento, valor, linha }`.
 *
 * Linhas sem número de documento são descartadas — o export traz cabeçalhos de
 * grupo e totalizadores misturados às notas, e eles não são lançamentos.
 */
export async function lerLancamentos(b, nomeArquivo = '') {
  const nome = String(nomeArquivo).toLowerCase();
  let linhas = null;

  if (nome.endsWith('.xlsx') || nome.endsWith('.xlsm')) {
    linhas = await lerXlsx(b);
  } else {
    // Um .csv de verdade é texto. Byte nulo logo no começo denuncia o binário do
    // sistema contábil exportado com a extensão trocada.
    const pareceBinario = b.subarray(0, 512).includes(0);
    linhas = pareceBinario ? decodificarClientDataSet(b) : lerCsv(b.toString('utf8'));
    if (!linhas && !pareceBinario) linhas = lerCsv(b.toString('latin1'));
  }

  if (!linhas || linhas.length === 0) {
    throw new Error('Não consegui ler nenhuma linha deste arquivo. Exporte em CSV ou XLSX e tente de novo.');
  }

  const colDoc = acharColuna(linhas, COLUNA_DOCUMENTO);
  const colValor = acharColuna(linhas, COLUNA_VALOR);

  if (!colDoc) {
    throw new Error(
      `Não achei a coluna do número da nota. Esperava "documento_inicial". Colunas do arquivo: ${Object.keys(linhas[0]).slice(0, 12).join(', ')}`
    );
  }
  if (!colValor) {
    throw new Error(
      `Não achei a coluna do valor. Esperava "valor_contabil". Colunas do arquivo: ${Object.keys(linhas[0]).slice(0, 12).join(', ')}`
    );
  }

  const lancamentos = [];
  for (const l of linhas) {
    const documento = soNumero(l[colDoc]);
    if (!documento) continue; // cabeçalho de grupo ou totalizador, não é lançamento
    lancamentos.push({ documento, valor: numeroBR(l[colValor]), linha: l });
  }

  if (lancamentos.length === 0) {
    throw new Error(`Li ${linhas.length} linha(s), mas nenhuma tinha número de documento em "${colDoc}".`);
  }

  return { lancamentos, colunaDocumento: colDoc, colunaValor: colValor, totalLinhas: linhas.length };
}
