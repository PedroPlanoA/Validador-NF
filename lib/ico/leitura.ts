import {
  FOCO,
  PESOS,
  type BaseTri,
  type DadosObrigacoes,
  type EmpresaBase,
  type ObrigacaoFoco,
  type Tri,
  type Voto,
} from "./tipos";
import { int, rotuloTri, rotuloTriLongo } from "./formato";

/**
 * Leitura dos arquivos de entrada (CSV ou planilha), feita no navegador. As
 * armadilhas conhecidas desta base estão tratadas aqui: acento quebrado
 * (UTF-8 lido como CP1252), separador `;`, vírgula decimal, "R$" dentro da
 * célula, datas em dd/mm/aaaa ou número de série do Excel, e cabeçalho que não
 * está na linha 1.
 */

const CP1252: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87,
  0x2c6: 0x88, 0x2030: 0x89, 0x160: 0x8a, 0x2039: 0x8b, 0x152: 0x8c, 0x17d: 0x8e, 0x2018: 0x91,
  0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x2dc: 0x98,
  0x2122: 0x99, 0x161: 0x9a, 0x203a: 0x9b, 0x153: 0x9c, 0x17e: 0x9e, 0x178: 0x9f,
};

export function consertaAcento(v: string): string {
  if (!/[ÃÂ]/.test(v)) return v;
  const bytes: number[] = [];
  for (let i = 0; i < v.length; i++) {
    const c = v.codePointAt(i)!;
    if (c > 0xffff) i++;
    bytes.push(c < 256 ? c : (CP1252[c] ?? 0x3f));
  }
  try {
    const r = new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(bytes));
    return r.includes("�") ? v : r;
  } catch {
    return v;
  }
}

export function parseCsv(texto: string): string[][] {
  const txt = texto.replace(/^﻿/, "");
  const l0 = txt.split("\n")[0];
  const sep = l0.split(";").length > l0.split(",").length ? ";" : ",";
  const out: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) {
      if (c === '"') {
        if (txt[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === sep) {
      row.push(cur);
      cur = "";
    } else if (c === "\n") {
      row.push(cur);
      out.push(row);
      row = [];
      cur = "";
    } else if (c !== "\r") cur += c;
  }
  if (cur !== "" || row.length) {
    row.push(cur);
    out.push(row);
  }
  return out.map((r) => r.map(consertaAcento));
}

/** Linhas de uma aba do Excel como texto, no mesmo formato que o CSV produziria. */
export function linhasDaPlanilha(matriz: unknown[][]): string[][] {
  return matriz.map((r) =>
    r.map((c) => {
      if (c === null || c === undefined) return "";
      if (typeof c === "number") return String(c).replace(".", ",");
      if (c instanceof Date) return c.toISOString().slice(0, 10);
      return consertaAcento(String(c));
    }),
  );
}

function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  let s = String(v).replace(/R\$/g, "").replace(/\s| /g, "");
  if (s === "" || s === "-") return 0;
  s = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}

function data(v: unknown): Date | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s || s === "-") return null;
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  if (/^\d{5}$/.test(s)) return new Date(Date.UTC(1899, 11, 30) + +s * 86400000);
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return null;
}

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
export const triDe = (d: Date | null): Tri | null => (d ? `${d.getUTCFullYear()}-T${Math.floor(d.getUTCMonth() / 3) + 1}` : null);

function achaCabecalho(linhas: string[][], obrig: string[]): number {
  for (let i = 0; i < Math.min(12, linhas.length); i++) {
    const set = new Set(linhas[i].filter(Boolean).map((h) => String(h).trim()));
    if (obrig.every((c) => set.has(c))) return i;
  }
  return -1;
}

function indices(h: string[]): Record<string, number> {
  const o: Record<string, number> = {};
  h.forEach((k, i) => {
    if (k) o[String(k).trim()] = i;
  });
  return o;
}

export function leBase(linhas: string[][]): BaseTri | null {
  const hi = achaCabecalho(linhas, ["ID", "Pontos", "Grau"]);
  if (hi < 0) return null;
  const ix = indices(linhas[hi]);
  let ini: Date | null = null;
  let fim: Date | null = null;
  for (const linha of linhas) {
    for (let c = 0; c < Math.min(4, linha.length); c++) {
      const cel = String(linha[c] || "").trim().toLowerCase();
      if (cel.startsWith("data in")) ini = data(linha[c + 1]);
      if (cel.startsWith("data fim")) fim = data(linha[c + 1]);
    }
  }
  const empresas: EmpresaBase[] = [];
  for (let r = hi + 1; r < linhas.length; r++) {
    const L = linhas[r];
    if (!L || L.length < 10) continue;
    const id = String(L[ix["ID"]] || "").trim();
    if (!/^\d+$/.test(id)) continue;
    const comp: Record<string, number> = {};
    for (const p of PESOS) comp[p.campo] = num(L[ix[p.campo]]);
    empresas.push({
      id,
      nome: String(L[ix["Empresa"]] || "").trim(),
      situacao: String(L[ix["Situação"]] || "").trim(),
      regime: String(L[ix["Regime"]] || "").trim(),
      honorarios: num(L[ix["valor_honorarios"]]),
      entradas: num(L[ix["entradas"]]),
      saidas: num(L[ix["saidas"]]),
      servicos: num(L[ix["servicos"]]),
      faturamento: num(L[ix["Faturamento"]]),
      obrigacoes: num(L[ix["Obrigações"]]),
      atendimento: num(L[ix["Atendimento"]]),
      comp,
      pontos: num(L[ix["Pontos"]]),
      grau: num(L[ix["Grau"]]),
    });
  }
  if (!empresas.length) return null;
  if (!fim) fim = ini;
  return { tri: triDe(fim) || "SEM-DATA", inicio: iso(ini), fim: iso(fim), empresas };
}

export function leObrigacoes(linhas: string[][]): { dados: DadosObrigacoes; tris: Tri[]; foco: number } | null {
  const hi = achaCabecalho(linhas, ["Fimmês", "EmpID", "Status"]);
  if (hi < 0) return null;
  const ix = indices(linhas[hi]);
  const out: ObrigacaoFoco[] = [];
  const votos = new Map<string, number>();
  const tris = new Set<Tri>();
  let total = 0;
  for (let r = hi + 1; r < linhas.length; r++) {
    const L = linhas[r];
    if (!L || L.length < 8) continue;
    const id = String(L[ix["EmpID"]] || "").trim();
    if (!id) continue;
    total++;
    const st = String(L[ix["Status"]] || "").trim();
    const fm = data(L[ix["Fimmês"]]);
    const triComp = triDe(fm);
    if (triComp) tris.add(triComp);
    const dono = String(L[ix["Responsável prazo"]] || "").trim();
    if (dono && dono !== "#N/A") {
      const k = JSON.stringify([id, triComp ?? "", dono]);
      votos.set(k, (votos.get(k) ?? 0) + 1);
    }
    const tarefa = String(L[ix["Obrigação / Tarefa"]] || "").trim();
    if (!fm || !FOCO.includes(tarefa)) continue;
    out.push({
      id,
      tarefa,
      empresa: String(L[ix["Empresa"]] || "").trim(),
      fimmes: iso(fm)!,
      entrega: iso(data(L[ix["Data da entrega"]])),
      status: st,
      entregue: /^Ent\./i.test(st),
      noPrazo: st === "Ent. antecipada" || st === "Ent. PzTéc.",
      dispensada: st === "Dispensada",
      resp: String(L[ix["Responsável entrega"]] || "").trim(),
      dono,
    });
  }
  if (!total) return null;
  const vs: Voto[] = [...votos].map(([k, n]) => {
    const [id, t, d] = JSON.parse(k) as [string, string, string];
    return [id, t, d, n];
  });
  return { dados: { linhas: out, votos: vs, total }, tris: [...tris].sort(), foco: out.length };
}

export interface ArquivoLido {
  tipo: "base" | "obr";
  tri: Tri | null;
  tag: string;
  detalhe: string;
  dados: BaseTri | DadosObrigacoes;
}

/** Identifica o arquivo pelo cabeçalho e devolve o que será guardado. */
export function reconhece(linhas: string[][]): ArquivoLido | null {
  const base = leBase(linhas);
  if (base) {
    return { tipo: "base", tri: base.tri, tag: rotuloTriLongo(base.tri), detalhe: `${base.empresas.length} empresas`, dados: base };
  }
  const ob = leObrigacoes(linhas);
  if (ob) {
    const ks = ob.tris;
    const tag = ks.length ? (ks.length === 1 ? rotuloTriLongo(ks[0]) : `${rotuloTri(ks[0])} a ${rotuloTri(ks[ks.length - 1])}`) : "sem data";
    return {
      tipo: "obr",
      tri: null,
      tag,
      detalhe: `${int(ob.dados.total)} linhas · ${int(ob.foco)} de referência`,
      dados: ob.dados,
    };
  }
  return null;
}
