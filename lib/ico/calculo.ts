import { triDe } from "./leitura";
import { FOCO, PESOS, type Arquivo, type DB, type EmpresaBase, type Obrigacao, type Tri } from "./tipos";

/**
 * Cálculos do relatório. São os mesmos do HTML original, portados sem mudar a
 * regra: carga e nota média de vários trimestres são a MÉDIA dos trimestres;
 * entregas somam o período inteiro; dispensadas ficam fora de tudo.
 */

const dia = (iso: string) => new Date(`${iso}T00:00:00Z`);

export function montarDB(arquivos: Arquivo[]): DB {
  const db: DB = { bases: {}, obr: [], votos: [], totalObr: 0 };
  for (const a of arquivos) {
    if (a.tipo === "base") {
      const mapa: Record<string, EmpresaBase> = {};
      for (const e of a.dados.empresas) mapa[e.id] = e;
      db.bases[a.dados.tri] = { ...a.dados, mapa };
    } else {
      for (const l of a.dados.linhas) {
        const fimmes = dia(l.fimmes);
        db.obr.push({ ...l, fimmes, entrega: l.entrega ? dia(l.entrega) : null, triComp: triDe(fimmes)! });
      }
      db.votos.push(...a.dados.votos);
      db.totalObr += a.dados.total;
    }
  }
  return db;
}

export function todosTris(db: DB): Tri[] {
  const s = new Set<Tri>(Object.keys(db.bases));
  for (const o of db.obr) if (o.triComp) s.add(o.triComp);
  return [...s].sort();
}

export function trisVisiveis(db: DB, soLancados: boolean): Tri[] {
  const t = todosTris(db);
  return soLancados ? t.filter((x) => db.bases[x]) : t;
}

export interface EmpresaAgregada {
  id: string;
  nome: string;
  regime: string;
  situacao: string;
  trimestres: number;
  honorarios: number;
  honMes: number;
  entradas: number;
  saidas: number;
  servicos: number;
  faturamento: number;
  obrigacoes: number;
  atendimento: number;
  pontos: number;
  comp: Record<string, number>;
  grau: number;
}

export interface Carteira {
  empresas: EmpresaAgregada[];
  carga: number;
  icoMedio: number;
  nEmpresas: number;
  nTris: number;
  comBase: Tri[];
}

const media = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);

/** Carteira de um conjunto de trimestres: média entre os trimestres com base. */
export function carteira(db: DB, tris: Tri[]): Carteira {
  const comBase = tris.filter((t) => db.bases[t]);
  if (!comBase.length) return { empresas: [], carga: 0, icoMedio: 0, nEmpresas: 0, nTris: 0, comBase: [] };
  const cargas = comBase.map((t) => db.bases[t].empresas.reduce((c, e) => c + e.pontos, 0));
  const contagens = comBase.map((t) => db.bases[t].empresas.length);
  const carga = media(cargas);
  const nEmp = media(contagens);

  type Acc = Omit<EmpresaAgregada, "trimestres" | "honMes" | "grau"> & { n: number };
  const acc: Record<string, Acc> = {};
  for (const t of comBase) {
    for (const e of db.bases[t].empresas) {
      let a = acc[e.id];
      if (!a) {
        a = acc[e.id] = {
          id: e.id, nome: e.nome, regime: e.regime, situacao: e.situacao, n: 0, trimestres: 0,
          honorarios: 0, entradas: 0, saidas: 0, servicos: 0, faturamento: 0, obrigacoes: 0, atendimento: 0,
          pontos: 0, comp: Object.fromEntries(PESOS.map((p) => [p.campo, 0])),
        } as Acc;
      }
      a.n++;
      a.nome = e.nome;
      a.regime = e.regime;
      a.situacao = e.situacao;
      a.honorarios += e.honorarios;
      a.entradas += e.entradas;
      a.saidas += e.saidas;
      a.servicos += e.servicos;
      a.faturamento += e.faturamento;
      a.obrigacoes += e.obrigacoes;
      a.atendimento += e.atendimento;
      a.pontos += e.pontos;
      for (const p of PESOS) a.comp[p.campo] += e.comp[p.campo] || 0;
    }
  }
  const empresas: EmpresaAgregada[] = Object.values(acc).map((a) => {
    const d = a.n;
    const pontos = Math.round((a.pontos / d) * 10) / 10;
    return {
      id: a.id, nome: a.nome, regime: a.regime, situacao: a.situacao, trimestres: a.n,
      honorarios: a.honorarios / d, honMes: Math.round(a.honorarios / d / 3),
      entradas: a.entradas / d, saidas: a.saidas / d, servicos: a.servicos / d,
      faturamento: a.faturamento / d, obrigacoes: a.obrigacoes / d, atendimento: a.atendimento / d,
      pontos, comp: Object.fromEntries(PESOS.map((p) => [p.campo, a.comp[p.campo] / d])), grau: Math.round(pontos),
    };
  });
  return {
    empresas,
    carga: Math.round(carga * 10) / 10,
    nEmpresas: Math.round(nEmp),
    icoMedio: nEmp ? carga / nEmp : 0,
    nTris: comBase.length,
    comBase,
  };
}

/** ICO de uma empresa dentro do período (média dos trimestres com base). */
export function fazIcoMap(db: DB, tris: Tri[]): Record<string, number> {
  const acc: Record<string, number> = {};
  const cnt: Record<string, number> = {};
  for (const t of tris.filter((x) => db.bases[x])) {
    for (const e of db.bases[t].empresas) {
      acc[e.id] = (acc[e.id] || 0) + e.pontos;
      cnt[e.id] = (cnt[e.id] || 0) + 1;
    }
  }
  return Object.fromEntries(Object.keys(acc).map((k) => [k, acc[k] / cnt[k]]));
}

/** O responsável pela empresa não existe na base; vem do "Responsável prazo" das obrigações. */
export function donoMap(db: DB, tris: Tri[]): (id: string) => string {
  const set = new Set(tris);
  const votos: Record<string, Record<string, number>> = {};
  const global: Record<string, Record<string, number>> = {};
  for (const [id, tri, dono, n] of db.votos) {
    (global[id] ||= {})[dono] = (global[id][dono] || 0) + n;
    if (set.has(tri)) (votos[id] ||= {})[dono] = (votos[id][dono] || 0) + n;
  }
  const top = (m?: Record<string, number>) => (m ? Object.keys(m).sort((a, b) => m[b] - m[a])[0] : null);
  return (id) => top(votos[id]) || top(global[id]) || "Não atribuído";
}

export interface EmpresaEntregue {
  id: string;
  empresa: string;
  mes: string;
  total: number;
  feitas: number;
  itens: Obrigacao[];
  data: Date | null;
  noPrazo: number;
  resp: string;
  tri: Tri;
  dia: string;
  todasNoPrazo: boolean;
}

/**
 * Uma "empresa entregue" é o par empresa + mês de competência cujas obrigações
 * de referência (as que ela tiver) saíram todas. A data é a da última delas.
 * Dispensadas não contam.
 */
export function empresasEntregues(db: DB, tris: Tri[]): EmpresaEntregue[] {
  const set = new Set(tris);
  type G = Omit<EmpresaEntregue, "tri" | "dia" | "todasNoPrazo">;
  const g: Record<string, G> = {};
  for (const o of db.obr) {
    if (!FOCO.includes(o.tarefa) || o.dispensada || !o.fimmes) continue;
    const mes = o.fimmes.toISOString().slice(0, 7);
    const k = `${o.id}|${mes}`;
    const a = (g[k] ||= { id: o.id, empresa: o.empresa, mes, total: 0, feitas: 0, itens: [], data: null, noPrazo: 0, resp: "Sem responsável" });
    a.total++;
    a.itens.push(o);
    if (o.entregue && o.entrega) {
      a.feitas++;
      if (!a.data || o.entrega > a.data) {
        a.data = o.entrega;
        a.resp = o.resp || "Sem responsável";
      }
      if (o.noPrazo) a.noPrazo++;
    }
  }
  const out: EmpresaEntregue[] = [];
  for (const a of Object.values(g)) {
    if (!a.data || a.feitas !== a.total) continue;
    const tri = triDe(a.data)!;
    if (!set.has(tri)) continue;
    out.push({ ...a, tri, dia: a.data.toISOString().slice(0, 10), todasNoPrazo: a.noPrazo === a.feitas });
  }
  return out;
}

/** Obrigações de referência por competência, sem dispensadas. */
export function competenciaDo(db: DB, tris: Tri[]): Obrigacao[] {
  const set = new Set(tris);
  return db.obr.filter((o) => FOCO.includes(o.tarefa) && !o.dispensada && set.has(o.triComp));
}

export interface DiaEntrega {
  dia: string;
  d: Date;
  entregas: number;
  pontos: number;
  noPrazo: number;
  itens: EmpresaEntregue[];
}

export function agregaDias(lista: EmpresaEntregue[], icoMap: Record<string, number>): DiaEntrega[] {
  const m: Record<string, DiaEntrega> = {};
  for (const e of lista) {
    const x = (m[e.dia] ||= { dia: e.dia, d: e.data!, entregas: 0, pontos: 0, noPrazo: 0, itens: [] });
    x.entregas++;
    x.pontos += icoMap[e.id] || 0;
    if (e.todasNoPrazo) x.noPrazo++;
    x.itens.push(e);
  }
  return Object.keys(m).sort().map((k) => m[k]);
}

export interface Pessoa {
  nome: string;
  entregas: number;
  pontos: number;
  noPrazo: number;
  qtdDias: number;
  empresas: number;
  mediaDia: number;
  mediaEntregas: number;
  icoMedio: number;
  aderencia: number;
}

export function agregaPessoas(lista: EmpresaEntregue[], icoMap: Record<string, number>): Pessoa[] {
  const m: Record<string, { nome: string; entregas: number; pontos: number; noPrazo: number; dias: Set<string>; ids: Set<string> }> = {};
  for (const e of lista) {
    const p = e.resp || "Sem responsável";
    const a = (m[p] ||= { nome: p, entregas: 0, pontos: 0, noPrazo: 0, dias: new Set(), ids: new Set() });
    a.entregas++;
    a.pontos += icoMap[e.id] || 0;
    if (e.todasNoPrazo) a.noPrazo++;
    a.dias.add(e.dia);
    a.ids.add(e.id);
  }
  return Object.values(m)
    .map((a) => {
      const qtdDias = a.dias.size;
      return {
        nome: a.nome, entregas: a.entregas, pontos: a.pontos, noPrazo: a.noPrazo, qtdDias, empresas: a.ids.size,
        mediaDia: qtdDias ? a.pontos / qtdDias : 0,
        mediaEntregas: qtdDias ? a.entregas / qtdDias : 0,
        icoMedio: a.entregas ? a.pontos / a.entregas : 0,
        aderencia: a.entregas ? a.noPrazo / a.entregas : 0,
      };
    })
    .sort((x, y) => y.icoMedio - x.icoMedio);
}

export interface Resumo {
  tris: Tri[];
  carteira: Carteira;
  icoMap: Record<string, number>;
  entregas: EmpresaEntregue[];
  dias: DiaEntrega[];
  distintas: number;
  producao: number;
  mediaDia: number;
  entregasDia: number;
  aderencia: number;
  conclusao: number;
  nComp: number;
  nFeitas: number;
}

export function resumo(db: DB, tris: Tri[]): Resumo {
  const c = carteira(db, tris);
  const icoMap = fazIcoMap(db, tris);
  const ent = empresasEntregues(db, tris);
  const dias = agregaDias(ent, icoMap);
  const prod = dias.reduce((s, d) => s + d.pontos, 0);
  const comp = competenciaDo(db, tris);
  const feitas = comp.filter((o) => o.entregue);
  return {
    tris, carteira: c, icoMap, entregas: ent, dias,
    distintas: new Set(ent.map((e) => e.id)).size,
    producao: prod,
    mediaDia: dias.length ? prod / dias.length : 0,
    entregasDia: dias.length ? ent.length / dias.length : 0,
    aderencia: feitas.length ? feitas.filter((o) => o.noPrazo).length / feitas.length : NaN,
    conclusao: comp.length ? feitas.length / comp.length : NaN,
    nComp: comp.length,
    nFeitas: feitas.length,
  };
}

// ─── Derivados usados pelas seções ──────────────────────────────────────────

export interface FatorComplexidade {
  rotulo: string;
  pontos: number;
  max: number;
  observado: number;
  real: number;
  potencial: number;
}

export function fatoresComplexidade(emp: EmpresaAgregada[]): { dados: FatorComplexidade[]; somaPesos: number } {
  const carga = emp.reduce((c, e) => c + e.pontos, 0);
  const somaPesos = PESOS.reduce((s, p) => s + p.max, 0);
  const dados = PESOS.map((p) => {
    let s = 0;
    let obs = 0;
    for (const e of emp) {
      const v = e.comp[p.campo] || 0;
      s += v;
      if (v > obs) obs = v;
    }
    return { rotulo: p.rotulo, pontos: Math.round(s * 10) / 10, max: p.max, observado: obs, real: carga ? s / carga : 0, potencial: p.max / somaPesos };
  }).sort((a, b) => b.real - a.real);
  return { dados, somaPesos };
}

export interface GrauResumo {
  grau: number;
  rotulo: string;
  empresas: number;
  pontos: number;
  shareEmp: number;
  shareCarga: number;
  medio: number;
}

export function resumoGraus(emp: EmpresaAgregada[]): GrauResumo[] {
  const carga = emp.reduce((c, e) => c + e.pontos, 0);
  return [0, 1, 2, 3, 4, 5].map((gr) => {
    const es = emp.filter((e) => e.grau === gr);
    const p = es.reduce((s, e) => s + e.pontos, 0);
    return {
      grau: gr, rotulo: `Grau ${gr}`, empresas: es.length, pontos: Math.round(p * 10) / 10,
      shareEmp: emp.length ? es.length / emp.length : 0, shareCarga: carga ? p / carga : 0, medio: es.length ? p / es.length : 0,
    };
  });
}

export interface ResponsavelResumo {
  nome: string;
  empresas: number;
  pontos: number;
  medio: number;
  graus: number[];
}

export function carteiraPorResponsavel(db: DB, emp: EmpresaAgregada[], tris: Tri[]): ResponsavelResumo[] {
  const dono = donoMap(db, tris);
  const m: Record<string, ResponsavelResumo> = {};
  for (const e of emp) {
    const d = dono(e.id);
    const r = (m[d] ||= { nome: d, empresas: 0, pontos: 0, medio: 0, graus: [0, 0, 0, 0, 0, 0] });
    r.empresas++;
    r.pontos += e.pontos;
    r.graus[Math.max(0, Math.min(5, e.grau))]++;
  }
  return Object.values(m)
    .map((r) => {
      r.pontos = Math.round(r.pontos * 10) / 10;
      r.medio = r.empresas ? r.pontos / r.empresas : 0;
      return r;
    })
    .sort((a, b) => b.pontos - a.pontos);
}

export interface MudancaGrau {
  alvo: Tri;
  ref: Tri;
  subiu: { e: EmpresaBase; de: number; para: number; dp: number }[];
  desceu: { e: EmpresaBase; de: number; para: number; dp: number }[];
  novos: EmpresaBase[];
  sairam: EmpresaBase[];
}

/** `null` quando não há par de trimestres lançados para comparar. */
export function mudancaGrau(db: DB, trisA: Tri[], trisB: Tri[] | null): MudancaGrau | null {
  const baseA = trisA.filter((t) => db.bases[t]);
  const alvo = baseA.length ? baseA[baseA.length - 1] : null;
  let ref: Tri | null;
  if (trisB) {
    const baseB = trisB.filter((t) => db.bases[t]);
    ref = baseB.length ? baseB[baseB.length - 1] : null;
  } else {
    const todos = Object.keys(db.bases).sort();
    const i = alvo ? todos.indexOf(alvo) : -1;
    ref = i > 0 ? todos[i - 1] : null;
  }
  if (!alvo || !ref) return null;
  const A = db.bases[alvo];
  const R = db.bases[ref];
  const subiu: MudancaGrau["subiu"] = [];
  const desceu: MudancaGrau["desceu"] = [];
  const novos: EmpresaBase[] = [];
  for (const e of A.empresas) {
    const a = R.mapa[e.id];
    if (!a) novos.push(e);
    else if (e.grau > a.grau) subiu.push({ e, de: a.grau, para: e.grau, dp: e.pontos - a.pontos });
    else if (e.grau < a.grau) desceu.push({ e, de: a.grau, para: e.grau, dp: e.pontos - a.pontos });
  }
  const sairam = R.empresas.filter((e) => !A.mapa[e.id]);
  const ordPontos = (x: EmpresaBase, y: EmpresaBase) => y.pontos - x.pontos;
  novos.sort(ordPontos);
  sairam.sort(ordPontos);
  subiu.sort((x, y) => y.para - y.de - (x.para - x.de) || y.dp - x.dp);
  desceu.sort((x, y) => x.para - x.de - (y.para - y.de) || x.dp - y.dp);
  return { alvo, ref, subiu, desceu, novos, sairam };
}

/** Mediana e moda dos pontos das empresas da carteira. */
export function estatisticas(emp: EmpresaAgregada[]): { mediana: number; modas: number[]; freqModa: number } | null {
  if (!emp.length) return null;
  const ord = emp.map((e) => e.pontos).sort((x, y) => x - y);
  const n = ord.length;
  const mediana = n % 2 ? ord[(n - 1) / 2] : (ord[n / 2 - 1] + ord[n / 2]) / 2;
  const freq: Record<string, number> = {};
  let maxF = 0;
  for (const v of ord) {
    freq[v] = (freq[v] || 0) + 1;
    if (freq[v] > maxF) maxF = freq[v];
  }
  const modas = Object.keys(freq).filter((k) => freq[k] === maxF).map(Number).sort((a, b) => a - b);
  return { mediana, modas, freqModa: maxF };
}
