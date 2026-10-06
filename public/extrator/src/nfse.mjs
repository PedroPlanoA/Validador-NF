// Converte o XML da NFS-e nacional (leiaute 1.01) numa linha de relatório.
//
// Todos os caminhos aqui foram conferidos contra XMLs reais devolvidos pelo ADN,
// não contra o manual — onde os dois divergem, quem manda é o arquivo.

import { parseXml, nó, txt, txtAlt } from './xml.mjs';

/** 100-Gerada, 102-Decisão judicial, 103-Avulsa, 107-MEI. Todas são notas válidas. */
const DESCRICAO_CSTAT = {
  100: 'Gerada',
  102: 'Decisão judicial',
  103: 'Avulsa',
  107: 'MEI',
};

const so = (s) => (s || '').replace(/\D/g, '');

/** 2026-03-13T16:29:28-03:00 → 2026-03-13 (mantém o dia local, sem passar por UTC). */
function soData(iso) {
  return (iso || '').slice(0, 10);
}

function numero(s) {
  if (!s) return 0;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

/** Lê uma NFS-e. `donoDoc` decide se a nota é emitida ou tomada pela empresa. */
export function lerNfse(xml, { nsu = null, donoDoc = '' } = {}) {
  const raiz = parseXml(xml);
  const inf = nó(raiz, 'infNFSe');
  const dps = nó(inf, 'DPS/infDPS');

  const emitDoc = txtAlt(inf, 'emit/CNPJ', 'emit/CPF');
  const tomaDoc = txtAlt(dps, 'toma/CNPJ', 'toma/CPF');
  // A empresa também recebe na caixa nota em que ela é apenas **intermediária**.
  // Essa nota pode não ter bloco `toma` nenhum — visto num lote real: 1 em 50.
  // Sem ler `interm`, ela parecia uma nota sem parte identificada.
  const intermDoc = txtAlt(dps, 'interm/CNPJ', 'interm/CPF');
  const dono = so(donoDoc);

  const cStat = txt(inf, 'cStat');
  const chSubstituida = txt(dps, 'subst/chSubstda');

  return {
    nsu,
    chave: (inf.attrs.Id || '').replace(/^NFS/, ''),
    tipo: dono && so(emitDoc) === dono ? 'EMITIDA' : dono && so(tomaDoc) === dono ? 'TOMADA' : 'INDEFINIDO',

    // Identificação
    numero: txt(inf, 'nNFSe'),
    nDFSe: txt(inf, 'nDFSe'),
    serie: txt(dps, 'serie'),
    nDPS: txt(dps, 'nDPS'),
    dataEmissao: soData(txt(dps, 'dhEmi')),
    dataGeracao: soData(txt(inf, 'dhProc')),
    competencia: soData(txt(dps, 'dCompet')),
    cStat,
    descricaoCStat: DESCRICAO_CSTAT[Number(cStat)] || cStat,

    // Situação: por padrão normal; eventos e substituição sobrescrevem depois.
    situacao: 'NORMAL',
    motivoSituacao: '',
    chaveSubstituida: chSubstituida,

    // Prestador
    emitDoc,
    emitNome: txt(inf, 'emit/xNome'),
    emitFantasia: txt(inf, 'emit/xFant'),
    emitIM: txt(inf, 'emit/IM'),
    emitMunicipio: txt(inf, 'xLocEmi'),
    emitUF: txt(inf, 'emit/enderNac/UF'),
    emitEmail: txt(inf, 'emit/email'),

    // Tomador
    tomaDoc,
    tomaNome: txt(dps, 'toma/xNome'),
    tomaIM: txt(dps, 'toma/IM'),
    tomaMunicipio: txt(dps, 'toma/end/endNac/cMun'),
    tomaEmail: txt(dps, 'toma/email'),

    // Intermediário
    intermDoc,
    intermNome: txt(dps, 'interm/xNome'),

    // Serviço
    codigoServico: txt(dps, 'serv/cServ/cTribNac'),
    codigoServicoMun: txt(dps, 'serv/cServ/cTribMun'),
    codigoNBS: txt(dps, 'serv/cServ/cNBS'),
    descricaoTribNac: txt(inf, 'xTribNac'),
    descricaoTribMun: txt(inf, 'xTribMun'),
    descricaoNBS: txt(inf, 'xNBS'),
    descricaoServico: txt(dps, 'serv/cServ/xDescServ'),
    infoComplementar: txt(dps, 'serv/infoCompl/xInfComp'),
    municipioPrestacao: txt(inf, 'xLocPrestacao'),
    municipioIncidencia: txt(inf, 'xLocIncid'),

    // Valores
    valorServico: numero(txt(dps, 'valores/vServPrest/vServ')),
    valorRecebido: numero(txt(dps, 'valores/vServPrest/vReceb')),
    valorLiquido: numero(txt(inf, 'valores/vLiq')),
    baseCalculo: numero(txt(inf, 'valores/vBC')),
    aliquotaAplicada: numero(txt(inf, 'valores/pAliqAplic')),
    valorISSQN: numero(txt(inf, 'valores/vISSQN')),
    // totalRetencoes e as demais retenções vêm de lerRetencoes(), mais abaixo.

    // Regime e tributação
    opSimpNac: txt(dps, 'prest/regTrib/opSimpNac'),
    regApTribSN: txt(dps, 'prest/regTrib/regApTribSN'),
    regEspTrib: txt(dps, 'prest/regTrib/regEspTrib'),
    tribISSQN: txt(dps, 'valores/trib/tribMun/tribISSQN'),
    aliquotaISS: numero(txt(dps, 'valores/trib/tribMun/pAliq')),
    valorPis: numero(txt(dps, 'valores/trib/tribFed/piscofins/vPis')),
    valorCofins: numero(txt(dps, 'valores/trib/tribFed/piscofins/vCofins')),
    percentualTribSN: numero(txt(dps, 'valores/trib/totTrib/pTotTribSN')),

    // Retenções — ver lerRetencoes() para a razão de cada conta.
    ...lerRetencoes(inf, dps),

    // Reforma tributária — já presente nas notas emitidas em 2026
    vTotNF: numero(txt(inf, 'IBSCBS/totCIBS/vTotNF')),
    vIBSTot: numero(txt(inf, 'IBSCBS/totCIBS/gIBS/vIBSTot')),
    vCBS: numero(txt(inf, 'IBSCBS/totCIBS/gCBS/vCBS')),
    cstIBSCBS: txt(dps, 'IBSCBS/valores/trib/gIBSCBS/CST'),
    cClassTrib: txt(dps, 'IBSCBS/valores/trib/gIBSCBS/cClassTrib'),

    municipioEmissorCodigo: txt(dps, 'cLocEmi'),
    ambienteGerador: txt(inf, 'ambGer') === '2' ? 'Sefin Nacional' : 'Município',
  };
}

/** 1-Não Retido; 2-Retido pelo Tomador; 3-Retido pelo Intermediário. */
const ISS_RETIDO_POR = { 2: 'Tomador', 3: 'Intermediário' };

/**
 * Códigos de `tpRetPisCofins` em que cada tributo é efetivamente retido.
 * 0-Não Retidos; 1-PIS/COFINS Retido; 2-Não Retido; 3-Retidos; 4-PIS/COFINS Ret
 * CSLL Não; 5-PIS Ret; 6-COFINS Ret; 7-PIS Não COFINS/CSLL Ret; 8-PIS/COFINS Não
 * CSLL Ret; 9-COFINS Não PIS/CSLL Ret. A tag AUSENTE significa nada retido.
 */
const PIS_RETIDO = new Set(['1', '3', '4', '5', '9']);
const COFINS_RETIDO = new Set(['1', '3', '4', '6', '7']);

/**
 * Separa as retenções da nota, contando só o que foi REALMENTE retido.
 *
 * A armadilha central: quase todo valor de tributo existe na nota mesmo sem
 * retenção nenhuma. `vISSQN` é o ISS devido; `vPis`/`vCofins` são calculados
 * sempre. O que diz se viraram retenção são os códigos `tpRetISSQN` e
 * `tpRetPisCofins` — e a ausência do código significa "não retido".
 *
 * `vTotalRet` NÃO serve de atalho, embora o leiaute o descreva como a soma das
 * retenções. Num lote real, uma nota trazia vTotalRet de R$ 3,18 com vPis 0,57 +
 * vCofins 2,61, sem `tpRetPisCofins`, ISS não retido e `vLiq` IGUAL ao valor do
 * serviço — ou seja, nada foi descontado de ninguém. Aquele município preenche o
 * campo com o tributo calculado (o mesmo 3,18 aparece em `vTotTribFed`, que é a
 * informação de tributos aproximados). Confiar nele criaria retenção fantasma no
 * relatório. O valor lido fica guardado em `totalRetencoesXml` só para conferência.
 */
function lerRetencoes(inf, dps) {
  const tpRetISSQN = txt(dps, 'valores/trib/tribMun/tpRetISSQN');
  const issFoiRetido = tpRetISSQN === '2' || tpRetISSQN === '3';
  const issRetidoValor = issFoiRetido ? numero(txt(inf, 'valores/vISSQN')) : 0;

  const tpRetPisCofins = txt(dps, 'valores/trib/tribFed/piscofins/tpRetPisCofins');
  const pisRetido = PIS_RETIDO.has(tpRetPisCofins)
    ? numero(txt(dps, 'valores/trib/tribFed/piscofins/vPis'))
    : 0;
  const cofinsRetido = COFINS_RETIDO.has(tpRetPisCofins)
    ? numero(txt(dps, 'valores/trib/tribFed/piscofins/vCofins'))
    : 0;

  // Estes três são campos de retenção por definição — o nome já diz.
  const valorIRRF = numero(txt(dps, 'valores/trib/tribFed/vRetIRRF'));
  const valorCP = numero(txt(dps, 'valores/trib/tribFed/vRetCP'));
  const valorCSLL = numero(txt(dps, 'valores/trib/tribFed/vRetCSLL'));

  const valorCSRF = arredondar(pisRetido + cofinsRetido + valorCSLL);
  const totalRetencoes = arredondar(issRetidoValor + valorIRRF + valorCP + valorCSRF);

  return {
    totalRetencoes,
    totalRetencoesXml: numero(txt(inf, 'valores/vTotalRet')),
    issRetido: issFoiRetido ? 'Sim' : 'Não',
    issRetidoPor: ISS_RETIDO_POR[tpRetISSQN] ?? '',
    issRetidoValor,
    valorIRRF,
    valorCP,
    valorCSLL,
    valorPisRetido: pisRetido,
    valorCofinsRetido: cofinsRetido,
    valorCSRF,
  };
}

/** Centavos, para o troco da subtração não virar 0.009999 no relatório. */
const arredondar = (n) => Math.round(n * 100) / 100;

/** Lê um XML de evento (cancelamento, substituição...) do lote do ADN. */
export function lerEvento(xml, { nsu = null, tipoEvento = '' } = {}) {
  const raiz = parseXml(xml);
  const inf = nó(raiz, 'infEvento');
  const ped = nó(inf, 'pedRegEvento/infPedReg');

  // A tag do detalhe varia com o tipo do evento (e101101 = cancelamento).
  const detalhe = ped.filhos.find((f) => /^e\d+$/.test(f.nome));

  return {
    nsu,
    tipoEvento,
    codigoEvento: detalhe ? detalhe.nome.replace(/^e/, '') : '',
    chaveNfse: txt(ped, 'chNFSe'),
    dataEvento: soData(txt(ped, 'dhEvento') || txt(inf, 'dhProc')),
    autor: txtAlt(ped, 'CNPJAutor', 'CPFAutor'),
    descricao: detalhe ? txt(detalhe, 'xDesc') : '',
    motivo: detalhe ? txt(detalhe, 'xMotivo') : '',
  };
}

/**
 * Cruza notas com eventos e marca a situação de cada uma.
 *
 * Cancelamento e substituição chegam como documentos SEPARADOS, com NSU próprio
 * e posterior ao da nota. Uma nota cancelada continua no relatório — ela só não
 * pode entrar no faturamento, e é justamente isso que a conferência precisa ver.
 */
export function aplicarEventos(notas, eventos) {
  const porChave = new Map(notas.map((n) => [n.chave, n]));

  for (const ev of eventos) {
    const nota = porChave.get(ev.chaveNfse);
    if (!nota) continue; // evento de nota fora da janela sincronizada

    const tipo = (ev.tipoEvento || '').toUpperCase();
    if (tipo.includes('CANCEL')) {
      nota.situacao = 'CANCELADA';
      nota.motivoSituacao = ev.motivo || ev.descricao;
      nota.dataEvento = ev.dataEvento;
    } else if (tipo.includes('SUBSTIT')) {
      nota.situacao = 'SUBSTITUIDA';
      nota.motivoSituacao = ev.motivo || ev.descricao;
      nota.dataEvento = ev.dataEvento;
    } else if (tipo && nota.situacao === 'NORMAL') {
      nota.motivoSituacao = ev.descricao || tipo;
    }
  }

  // Uma nota que substitui outra marca a substituída — mesmo sem evento próprio.
  for (const nota of notas) {
    if (!nota.chaveSubstituida) continue;
    const anterior = porChave.get(nota.chaveSubstituida);
    if (anterior && anterior.situacao === 'NORMAL') {
      anterior.situacao = 'SUBSTITUIDA';
      anterior.motivoSituacao = `Substituída pela nota ${nota.numero}`;
    }
  }

  return notas;
}

/**
 * Marca cada nota como EMITIDA ou TOMADA depois que o dono da caixa é conhecido.
 *
 * Existe como passo separado porque o dono só é descoberto olhando as notas já
 * lidas — na leitura de cada XML, sozinha, ainda não há como saber.
 */
export function classificarTipo(notas, donoDoc) {
  const dono = so(donoDoc);
  for (const n of notas) {
    n.tipo = so(n.emitDoc) === dono ? 'EMITIDA' : so(n.tomaDoc) === dono ? 'TOMADA' : 'INDEFINIDO';
  }
  return notas;
}

/**
 * Descobre de quem é a caixa: o CNPJ/CPF que mais aparece como parte
 * (prestador, tomador ou intermediário) nos documentos lidos.
 */
export function detectarDono(notas) {
  // Por **frequência**, não por interseção.
  //
  // A regra anterior exigia o CNPJ em TODA nota da amostra, e bastava uma nota em
  // que a empresa não fosse parte para zerar tudo — a caixa do ADN também traz
  // documentos em que ela entra como intermediária, e nota sem tomador
  // identificado tem só um lado. Zerada a interseção, ler mais lotes não
  // recuperava: a nota que envenenou a conta continua na amostra.
  //
  // O dono é quem aparece em mais documentos. Numa caixa real ele aparece em
  // quase todos, e um documento fora da curva deixa de decidir o resultado.
  const contagem = new Map();
  for (const n of notas) {
    for (const doc of new Set([so(n.emitDoc), so(n.tomaDoc), so(n.intermDoc)].filter(Boolean))) {
      contagem.set(doc, (contagem.get(doc) ?? 0) + 1);
    }
  }
  if (contagem.size === 0) return [];

  // O empate continua sendo empate: com duas notas entre as mesmas duas partes,
  // as duas aparecem igual, e quem decide é o aviso na tela — como antes.
  const maior = Math.max(...contagem.values());
  return [...contagem].filter(([, quantas]) => quantas === maior).map(([doc]) => doc);
}
