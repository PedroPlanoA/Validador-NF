// Estado da sessão: a empresa do certificado conectado AGORA, só em memória.
//
// Duas fases:
//   1. Conectada  — sabemos de quem é a caixa (lido do primeiro lote), mas nada
//                   mais foi baixado. É quando os filtros são escolhidos.
//   2. Carregada  — os documentos do período pedido estão na memória.
//
// Nada é gravado em disco. Trocar de certificado descarta tudo.

import zlib from 'node:zlib';
import { lerNfse, lerEvento, aplicarEventos, detectarDono, classificarTipo } from './nfse.mjs';

/** ArquivoXml do ADN vem em base64 de um gzip. */
export function descompactar(base64) {
  const bytes = Buffer.from(base64, 'base64');
  try {
    return zlib.gunzipSync(bytes).toString('utf8');
  } catch {
    return bytes.toString('utf8'); // tolerância caso algum item venha sem compressão
  }
}

const so = (s) => (s || '').replace(/\D/g, '');

export class SessaoEmpresa {
  constructor() {
    this.limpar();
  }

  limpar() {
    this.cnpj = '';
    this.nome = '';
    this.conectadaEm = null;
    this.carregadaEm = null;
    this.filtro = null;
    this.notas = [];
    this.eventos = [];
    /** Notas em que a empresa é só intermediária: ficam fora do relatório, mas
     *  são contadas para poderem ser declaradas na tela. */
    this.intermediadas = 0;
    /** @type {Map<string,string>} `TIPO:NSU` → XML, para o download individual. */
    this.xmls = new Map();
    this._amostra = [];
    /** O que veio na etapa de identificação. Sem isso, "a caixa não tem NFS-e"
     *  é um palpite: caixa vazia, caixa só de eventos e XML ilegível davam a
     *  mesma frase, e nenhuma delas dizia qual tinha acontecido. */
    this._diag = { documentos: 0, nfse: 0, eventos: 0, outros: 0, ilegiveis: 0 };
  }

  get diagnostico() {
    return { ...this._diag };
  }

  get conectada() {
    return this.conectadaEm !== null;
  }

  get carregada() {
    return this.carregadaEm !== null;
  }

  /**
   * Descobre de quem é a caixa a partir dos primeiros lotes.
   *
   * O dono é o CNPJ/CPF que aparece em TODO documento, como prestador ou tomador.
   * Com poucas notas pode haver empate — daí acumular mais um lote resolve.
   * Devolve os candidatos que restaram.
   */
  identificar(documentos) {
    for (const d of documentos) {
      this._diag.documentos++;
      if (d.TipoDocumento === 'EVENTO') {
        this._diag.eventos++;
        continue;
      }
      if (d.TipoDocumento !== 'NFSE' || !d.ArquivoXml) {
        this._diag.outros++;
        continue;
      }
      try {
        this._amostra.push(lerNfse(descompactar(d.ArquivoXml)));
        this._diag.nfse++;
      } catch {
        // Documento ilegível não invalida a detecção — mas é contado, senão um
        // leiaute que o parser não entende se disfarça de caixa vazia.
        this._diag.ilegiveis++;
      }
    }

    const candidatos = detectarDono(this._amostra);
    if (candidatos.length === 1) {
      this.cnpj = candidatos[0];
      this.nome = nomeDaEmpresa(this._amostra, this.cnpj);
      this.conectadaEm = new Date().toISOString();
    }
    return candidatos;
  }

  /** Assume um dono quando a detecção terminou empatada. */
  assumirDono(cnpj) {
    this.cnpj = so(cnpj);
    this.nome = nomeDaEmpresa(this._amostra, this.cnpj);
    this.conectadaEm = new Date().toISOString();
  }

  /** Descarta uma carga anterior, mantendo a conexão (a empresa continua a mesma). */
  reiniciarCarga(filtro) {
    this.carregadaEm = null;
    this.filtro = filtro;
    this.notas = [];
    this.eventos = [];
    this.xmls = new Map();
    this.intermediadas = 0;
  }

  /**
   * Interpreta um documento do lote e decide se ele entra.
   *
   * É aqui que o filtro acontece — ANTES de guardar. Documento fora do período ou
   * do tipo pedido é descartado na hora, sem ocupar memória.
   *
   * Eventos entram sempre: são poucos, e um cancelamento precisa ser conhecido
   * para riscar a nota certa, mesmo tendo chegado bem depois dela.
   */
  considerar(documento, { tipo, de, ate, base }) {
    const nsu = Number(documento.NSU);
    if (!documento.ArquivoXml) return false;

    let xml;
    try {
      xml = descompactar(documento.ArquivoXml);
    } catch {
      return false;
    }

    if (documento.TipoDocumento === 'EVENTO') {
      try {
        this.eventos.push(lerEvento(xml, { nsu, tipoEvento: documento.TipoEvento || tipoDoEvento(xml) }));
        this.xmls.set(`EVENTO:${nsu}`, xml);
        return true;
      } catch {
        return false;
      }
    }

    if (documento.TipoDocumento !== 'NFSE') return false;

    let nota;
    try {
      nota = lerNfse(xml, { nsu });
    } catch {
      return false;
    }

    // Emitida ou tomada: comparação direta com o CNPJ do certificado conectado.
    const ehEmitida = so(nota.emitDoc) === this.cnpj;
    const ehTomada = so(nota.tomaDoc) === this.cnpj;
    if (tipo === 'EMITIDA' && !ehEmitida) return false;
    if (tipo === 'TOMADA' && !ehTomada) return false;

    if (!ehEmitida && !ehTomada) {
      // A empresa recebe na caixa nota em que é apenas **intermediária**. Ela não
      // é faturamento nem despesa dela, então fica fora do relatório — mas sair
      // **em silêncio** é o que não pode: numa ferramenta de conferência, um
      // documento que existe na caixa e não aparece em lugar nenhum é a pior
      // forma de estar errado. É contada e declarada na tela.
      if (so(nota.intermDoc) === this.cnpj) this.intermediadas++;
      return false;
    }

    const data = base === 'competencia' ? nota.competencia : nota.dataEmissao;
    if (!data) return false;
    if (de && data < de) return false;
    if (ate && data > ate) return false;

    nota.tipo = ehEmitida ? 'EMITIDA' : 'TOMADA';
    this.notas.push(nota);
    this.xmls.set(`NFSE:${nsu}`, xml);
    return true;
  }

  /** Fecha a carga: cruza eventos com notas e ordena. */
  concluirCarga() {
    classificarTipo(this.notas, this.cnpj);
    aplicarEventos(this.notas, this.eventos);
    this.notas.sort((a, b) => a.dataEmissao.localeCompare(b.dataEmissao) || Number(a.nsu) - Number(b.nsu));
    this.carregadaEm = new Date().toISOString();

    // Eventos de notas fora do período não servem para nada e só ocupam espaço.
    const chaves = new Set(this.notas.map((n) => n.chave));
    for (const ev of this.eventos) {
      if (chaves.has(ev.chaveNfse)) continue;
      this.xmls.delete(`EVENTO:${ev.nsu}`);
    }
    this.eventos = this.eventos.filter((ev) => chaves.has(ev.chaveNfse));
  }

  /** A data mais antiga realmente carregada, para conferir se a margem bastou. */
  primeiraDataCarregada(base) {
    const campo = base === 'competencia' ? 'competencia' : 'dataEmissao';
    return this.notas.reduce((m, n) => (!m || (n[campo] && n[campo] < m) ? n[campo] : m), '');
  }

  descrever() {
    if (!this.conectada) return { conectada: false, carregada: false };
    return {
      conectada: true,
      carregada: this.carregada,
      cnpj: this.cnpj,
      nome: this.nome,
      conectadaEm: this.conectadaEm,
      carregadaEm: this.carregadaEm,
      filtro: this.filtro,
      notas: this.notas.length,
      eventos: this.eventos.length,
      intermediadas: this.intermediadas,
    };
  }

  xml(tipo, nsu) {
    return this.xmls.get(`${tipo}:${nsu}`) ?? null;
  }
}

/** Sem o TipoEvento do lote, o código da tag identifica o evento. */
function tipoDoEvento(xml) {
  if (/<e101101>/.test(xml)) return 'CANCELAMENTO';
  if (/<e105102>/.test(xml)) return 'SUBSTITUICAO';
  const m = /<e(\d{6})>/.exec(xml);
  return m ? `EVENTO_${m[1]}` : '';
}

/** O nome sai da própria nota: como prestador se houver emitida, senão como tomador. */
function nomeDaEmpresa(notas, cnpj) {
  const comoPrestador = notas.find((n) => so(n.emitDoc) === cnpj);
  if (comoPrestador) return comoPrestador.emitNome;
  return notas.find((n) => so(n.tomaDoc) === cnpj)?.tomaNome ?? '';
}
