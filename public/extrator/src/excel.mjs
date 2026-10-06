// Geração do Excel com os dados integrais das notas.

import ExcelJS from 'exceljs';
import { resumir, porCompetencia } from './relatorio.mjs';

const MOEDA = '#,##0.00';

// Ordem pensada para a conferência: o que se lê primeiro vem primeiro. As colunas
// fiscais detalhadas ficam à direita, disponíveis sem atrapalhar a leitura.
const COLUNAS = [
  { header: 'Número', key: 'numero', width: 16 },
  { header: 'Situação', key: 'situacaoLegivel', width: 14 },
  { header: 'Emissão', key: 'dataEmissao', width: 12 },
  { header: 'Competência', key: 'competencia', width: 13 },
  { header: 'Tomador', key: 'tomaNome', width: 38 },
  { header: 'CNPJ/CPF Tomador', key: 'tomaDocFormatado', width: 20 },
  { header: 'Prestador', key: 'emitNome', width: 38 },
  { header: 'CNPJ/CPF Prestador', key: 'emitDocFormatado', width: 20 },
  { header: 'Cód. Serviço', key: 'codigoServico', width: 13 },
  { header: 'Descrição do Código', key: 'descricaoTribNac', width: 45 },
  { header: 'Descrição do Serviço', key: 'descricaoServico', width: 45 },
  { header: 'Valor do Serviço', key: 'valorServico', width: 16, style: { numFmt: MOEDA } },
  { header: 'Valor Líquido', key: 'valorLiquido', width: 16, style: { numFmt: MOEDA } },
  { header: 'Base de Cálculo', key: 'baseCalculo', width: 16, style: { numFmt: MOEDA } },
  { header: 'Alíquota (%)', key: 'aliquotaAplicada', width: 12 },
  { header: 'ISSQN', key: 'valorISSQN', width: 14, style: { numFmt: MOEDA } },

  // Retenções, agrupadas: primeiro se houve, depois cada uma, depois o total.
  { header: 'ISS Retido?', key: 'issRetido', width: 12 },
  { header: 'Retido por', key: 'issRetidoPor', width: 14 },
  { header: 'ISS Retido', key: 'issRetidoValor', width: 14, style: { numFmt: MOEDA } },
  { header: 'IRRF', key: 'valorIRRF', width: 14, style: { numFmt: MOEDA } },
  { header: 'CSRF (PIS/COFINS/CSLL)', key: 'valorCSRF', width: 22, style: { numFmt: MOEDA } },
  { header: 'INSS (CP)', key: 'valorCP', width: 14, style: { numFmt: MOEDA } },
  { header: 'Total Retenções', key: 'totalRetencoes', width: 16, style: { numFmt: MOEDA } },

  // Detalhe da CSRF e os valores calculados, para quem precisar abrir a conta.
  { header: 'PIS Retido', key: 'valorPisRetido', width: 13, style: { numFmt: MOEDA } },
  { header: 'COFINS Retido', key: 'valorCofinsRetido', width: 15, style: { numFmt: MOEDA } },
  { header: 'CSLL Retida', key: 'valorCSLL', width: 13, style: { numFmt: MOEDA } },
  { header: 'PIS calculado', key: 'valorPis', width: 14, style: { numFmt: MOEDA } },
  { header: 'COFINS calculado', key: 'valorCofins', width: 16, style: { numFmt: MOEDA } },
  { header: 'vTotalRet (XML)', key: 'totalRetencoesXml', width: 16, style: { numFmt: MOEDA } },
  { header: 'Município Prestação', key: 'municipioPrestacao', width: 20 },
  { header: 'Município Incidência', key: 'municipioIncidencia', width: 20 },
  { header: 'Cód. Serv. Municipal', key: 'codigoServicoMun', width: 16 },
  { header: 'Cód. NBS', key: 'codigoNBS', width: 14 },
  { header: 'Série', key: 'serie', width: 10 },
  { header: 'Nº DPS', key: 'nDPS', width: 14 },
  { header: 'Nº DFSe', key: 'nDFSe', width: 14 },
  { header: 'Status', key: 'descricaoCStat', width: 16 },
  { header: 'Ambiente Gerador', key: 'ambienteGerador', width: 18 },
  { header: 'Motivo (cancelamento)', key: 'motivoSituacao', width: 30 },
  { header: 'Total NF (IBS/CBS)', key: 'vTotNF', width: 17, style: { numFmt: MOEDA } },
  { header: 'IBS', key: 'vIBSTot', width: 12, style: { numFmt: MOEDA } },
  { header: 'CBS', key: 'vCBS', width: 12, style: { numFmt: MOEDA } },
  { header: 'Chave de Acesso', key: 'chave', width: 54 },
  { header: 'NSU', key: 'nsu', width: 10 },
];

const SITUACAO = { NORMAL: 'Normal', CANCELADA: 'Cancelada', SUBSTITUIDA: 'Substituída' };

const formatarDoc = (d) => {
  const s = (d || '').replace(/\D/g, '');
  if (s.length === 14) return s.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  if (s.length === 11) return s.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return d || '';
};

const dataBR = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

/** Monta a planilha e devolve o buffer do .xlsx. */
export async function gerarExcel(notas, { empresa = '', tipo = 'EMITIDA', de = '', ate = '', base = 'emissao' } = {}) {
  const livro = new ExcelJS.Workbook();
  livro.creator = 'Plano A Contabilidade';
  livro.created = new Date();

  const aba = livro.addWorksheet('Notas', { views: [{ state: 'frozen', ySplit: 1 }] });
  aba.columns = COLUNAS;

  for (const n of notas) {
    aba.addRow({
      ...n,
      situacaoLegivel: SITUACAO[n.situacao] ?? n.situacao,
      dataEmissao: dataBR(n.dataEmissao),
      competencia: dataBR(n.competencia),
      tomaDocFormatado: formatarDoc(n.tomaDoc),
      emitDocFormatado: formatarDoc(n.emitDoc),
    });
  }

  const cabecalho = aba.getRow(1);
  cabecalho.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cabecalho.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00323C' } };
  cabecalho.alignment = { vertical: 'middle' };
  cabecalho.height = 22;
  aba.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUNAS.length } };

  // Linhas de notas sem efeito fiscal ficam visualmente apagadas — quem bate o
  // faturamento não pode somá-las sem perceber.
  aba.eachRow((linha, i) => {
    if (i === 1) return;
    const situacao = linha.getCell('situacaoLegivel').value;
    if (situacao && situacao !== 'Normal') {
      linha.font = { color: { argb: 'FF9A9A9A' }, strike: true };
    }
  });

  montarResumo(livro.addWorksheet('Resumo'), notas, { empresa, tipo, de, ate, base });

  return Buffer.from(await livro.xlsx.writeBuffer());
}

function montarResumo(aba, notas, { empresa, tipo, de, ate, base }) {
  const r = resumir(notas);

  aba.columns = [
    { width: 32 },
    { width: 22 },
    { width: 16 },
    { width: 14 },
  ];

  const titulo = aba.addRow(['Relatório de NFS-e']);
  titulo.font = { bold: true, size: 14, color: { argb: 'FF00323C' } };
  aba.addRow([]);

  const rotulo = { emissao: 'data de emissão', competencia: 'competência' }[base] ?? base;
  for (const [chave, valor] of [
    ['Empresa', empresa],
    ['Tipo', tipo === 'EMITIDA' ? 'Notas emitidas' : tipo === 'TOMADA' ? 'Notas tomadas' : 'Emitidas e tomadas'],
    ['Período', `${dataBR(de) || 'início'} a ${dataBR(ate) || 'hoje'} (por ${rotulo})`],
    ['Gerado em', new Date().toLocaleString('pt-BR')],
  ]) {
    const linha = aba.addRow([chave, valor]);
    linha.getCell(1).font = { bold: true };
  }

  aba.addRow([]);
  const cab = aba.addRow(['Totais do período']);
  cab.font = { bold: true, color: { argb: 'FF007878' } };

  for (const [chave, valor, moeda] of [
    ['Notas válidas', r.quantidadeValidas],
    ['Notas canceladas', r.quantidadeCanceladas],
    ['Notas substituídas', r.quantidadeSubstituidas],
    ['Total de documentos', r.quantidade],
    ['Valor total (com retenções)', r.valorServicos, true],
    ['Valor líquido (após retenções)', r.valorLiquido, true],
    ['ISSQN', r.valorISSQN, true],
    ['Valor das canceladas e substituídas', r.valorCancelado, true],
  ]) {
    const linha = aba.addRow([chave, valor]);
    if (moeda) linha.getCell(2).numFmt = MOEDA;
  }

  aba.addRow([]);
  const cabRet = aba.addRow(['Retenções do período']);
  cabRet.font = { bold: true, color: { argb: 'FF007878' } };

  for (const [chave, valor] of [
    ['ISS retido', r.valorISSRetido],
    ['IRRF', r.valorIRRF],
    ['CSRF (PIS/COFINS/CSLL)', r.valorCSRF],
    ['INSS (CP)', r.valorCP],
    ['Total de retenções', r.valorRetencoes],
  ]) {
    const linha = aba.addRow([chave, valor]);
    linha.getCell(2).numFmt = MOEDA;
    if (chave.startsWith('Total')) linha.font = { bold: true };
  }

  aba.addRow([]);
  const cabMes = aba.addRow(['Competência', 'Notas', 'Valor líquido', 'Canceladas']);
  cabMes.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cabMes.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00323C' } };

  for (const m of porCompetencia(notas)) {
    const linha = aba.addRow([
      m.competencia.split('-').reverse().join('/'),
      m.quantidade,
      m.valor,
      m.canceladas || '',
    ]);
    linha.getCell(3).numFmt = MOEDA;
  }
}
