"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { int, pct, pct0, um, dois } from "@/lib/ico/formato";

export const COR = {
  mint: "#14B4A0",
  teal: "#007878",
  deep: "#00323C",
  clay: "#D97D54",
  muted: "rgba(20,20,20,.16)",
  grid: "rgba(20,20,20,.07)",
  soft: "rgba(0,120,120,.30)",
};
/** Escala de grau: verde claro no 0, escurecendo até o 5. */
export const RAMPA = ["#DCEFE9", "#A7DED2", "#5FC9B8", "#14B4A0", "#0B8577", "#00323C"];
export const corGrau = (g: number) => RAMPA[Math.max(0, Math.min(5, g))];
export const textoGrau = (g: number) => (g >= 3 ? "#ffffff" : "#0d3b36");

// ─── Tooltip ────────────────────────────────────────────────────────────────

export interface LinhaTip {
  txt: string;
  cor?: string;
}
interface TipCtx {
  mostra: (linhas: LinhaTip[], e: React.MouseEvent) => void;
  esconde: () => void;
}
const Ctx = createContext<TipCtx>({ mostra: () => {}, esconde: () => {} });
export const useTip = () => useContext(Ctx);

export function TipProvider({ children }: { children: ReactNode }) {
  const [tip, setTip] = useState<{ linhas: LinhaTip[]; x: number; y: number } | null>(null);
  const mostra = useCallback((linhas: LinhaTip[], e: React.MouseEvent) => setTip({ linhas, x: e.clientX, y: e.clientY }), []);
  const esconde = useCallback(() => setTip(null), []);
  return (
    <Ctx.Provider value={{ mostra, esconde }}>
      {children}
      <div
        className="fixed pointer-events-none z-[90] bg-deep text-white rounded-[10px] px-3 py-2 text-[12.5px] leading-[1.5] whitespace-nowrap shadow-card-hover transition-opacity"
        style={{
          opacity: tip ? 1 : 0,
          left: tip?.x ?? 0,
          top: tip?.y ?? 0,
          transform: "translate(-50%, calc(-100% - 14px))",
        }}
      >
        {tip?.linhas.map((l, i) => (
          <div key={i} className={i === 0 ? "text-mint font-semibold mb-0.5" : undefined}>
            {l.cor && <i className="inline-block w-2 h-2 rounded-[2px] mr-1.5" style={{ background: l.cor }} />}
            {l.txt}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

function useHover(linhas: LinhaTip[]) {
  const { mostra, esconde } = useTip();
  return { onMouseMove: (e: React.MouseEvent) => mostra(linhas, e), onMouseLeave: esconde };
}

// ─── Utilidades de gráfico ──────────────────────────────────────────────────

function useLargura(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setW(el.clientWidth));
    obs.observe(el);
    setW(el.clientWidth);
    return () => obs.disconnect();
  }, []);
  return [ref, Math.max(260, w || 320)];
}

const larguraTxt = (t: string) => t.length * 6.2;

function escala(max: number, n = 4): { topo: number; passos: number[] } {
  if (!(max > 0)) return { topo: 1, passos: [0, 0.25, 0.5, 0.75, 1] };
  const bruto = max / n;
  const mag = Math.pow(10, Math.floor(Math.log(bruto) / Math.LN10));
  let passo = mag * 10;
  for (const c of [1, 2, 2.5, 5, 10]) {
    if (c * mag >= bruto) {
      passo = c * mag;
      break;
    }
  }
  const topo = Math.ceil(max / passo) * passo;
  const out: number[] = [];
  for (let v = 0; v <= topo + passo / 1e6; v += passo) out.push(Math.round(v * 1e6) / 1e6);
  return { topo, passos: out };
}

const Barra = ({ linhas, ...p }: { linhas: LinhaTip[] } & React.SVGProps<SVGRectElement>) => {
  const h = useHover(linhas);
  return <rect {...p} {...h} />;
};

const T = { className: "fill-text-3", fontSize: 11 } as const;
const V = { className: "fill-text-2", fontSize: 11, fontWeight: 600 } as const;
const A = { className: "fill-text-2", fontSize: 11 } as const;

// ─── Gráficos ───────────────────────────────────────────────────────────────

export interface DadoFator {
  rotulo: string;
  real: number;
  potencial: number;
  pontos: number;
  max: number;
}

/** Barras horizontais: participação real × potencial pelo peso. */
export function BarrasRealPotencial({ dados }: { dados: DadoFator[] }) {
  const [ref, w] = useLargura();
  const H = Math.max(210, dados.length * 36 + 16);
  const lmax = Math.max(0, ...dados.map((d) => larguraTxt(d.rotulo)));
  const m = { t: 8, r: 56, b: 8, l: lmax + 12 };
  const x0 = m.l;
  const x1 = w - m.r;
  const alt = (H - m.t - m.b) / dados.length;
  const esc = escala(Math.max(0, ...dados.map((d) => Math.max(d.real, d.potencial))), 4);
  return (
    <div ref={ref} className="w-full min-w-0">
      <svg viewBox={`0 0 ${w} ${H}`} width="100%" height={H}>
        {dados.map((d, i) => {
          const y = m.t + alt * i;
          const hb = Math.min(11, alt * 0.3);
          const wR = Math.max(1, (d.real / esc.topo) * (x1 - x0));
          const wP = Math.max(1, (d.potencial / esc.topo) * (x1 - x0));
          const linhas = [
            { txt: d.rotulo },
            { txt: `participação real: ${pct(d.real)}`, cor: COR.mint },
            { txt: `potencial pelo peso: ${pct(d.potencial)}`, cor: COR.muted },
            { txt: `${um(d.pontos)} pontos · peso máximo ${um(d.max)}` },
          ];
          return (
            <g key={d.rotulo}>
              <text {...A} x={x0 - 10} y={y + alt / 2 + 4} textAnchor="end">{d.rotulo}</text>
              <Barra linhas={linhas} x={x0} y={y + alt / 2 - hb - 1} width={wR} height={hb} rx={3} fill={COR.mint} />
              <Barra linhas={linhas} x={x0} y={y + alt / 2 + 1} width={wP} height={hb} rx={3} fill={COR.muted} />
              <text {...V} x={Math.max(wR, wP) + x0 + 8} y={y + alt / 2 + 4}>{pct(d.real)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export interface DadoGrau {
  grau: number;
  rotulo: string;
  shareEmp: number;
  shareCarga: number;
  extraA: string;
  extraB: string;
}

/** Barras agrupadas: fatia de empresas × fatia da carga, por grau. */
export function BarrasGrupo({ dados }: { dados: DadoGrau[] }) {
  const [ref, w] = useLargura();
  const H = 250;
  const esc = escala(Math.max(0, ...dados.map((d) => Math.max(d.shareEmp, d.shareCarga))), 4);
  const topo = esc.topo;
  const m = { t: 10, r: 8, b: 30, l: larguraTxt(pct0(topo)) + 12 };
  const x0 = m.l;
  const x1 = w - m.r;
  const y0 = H - m.b;
  const y1 = m.t;
  const bw = (x1 - x0) / Math.max(1, dados.length);
  const Y = (v: number) => y0 - (v / topo) * (y0 - y1);
  return (
    <div ref={ref} className="w-full min-w-0">
      <svg viewBox={`0 0 ${w} ${H}`} width="100%" height={H}>
        {esc.passos.map((v) => (
          <g key={v}>
            <line x1={x0} x2={x1} y1={Y(v)} y2={Y(v)} stroke={COR.grid} />
            <text {...T} x={x0 - 8} y={Y(v) + 4} textAnchor="end">{pct0(v)}</text>
          </g>
        ))}
        {dados.map((d, i) => {
          const cx = x0 + bw * i;
          const larg = Math.min(26, (bw * 0.62) / 2);
          const gap = bw * 0.08;
          const linhas = [
            { txt: d.rotulo },
            { txt: `Empresas: ${d.extraA}`, cor: corGrau(d.grau) },
            { txt: `Pontos: ${d.extraB}`, cor: COR.clay },
          ];
          return (
            <g key={d.rotulo}>
              <Barra linhas={linhas} x={cx + bw / 2 - larg - gap / 2} y={Y(d.shareEmp)} width={larg} height={Math.max(1, y0 - Y(d.shareEmp))} rx={4} fill={corGrau(d.grau)} />
              <Barra linhas={linhas} x={cx + bw / 2 + gap / 2} y={Y(d.shareCarga)} width={larg} height={Math.max(1, y0 - Y(d.shareCarga))} rx={4} fill={COR.clay} />
              <text {...T} x={cx + bw / 2} y={y0 + 18} textAnchor="middle">{d.rotulo}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export interface DadoDia {
  pontos: number;
  entregas: number;
  rotulo: string;
  curto: string;
}

/** Barras verticais: produção por dia. */
export function BarrasDia({ dados }: { dados: DadoDia[] }) {
  const [ref, w] = useLargura();
  const H = 190;
  const esc = escala(Math.max(0, ...dados.map((d) => d.pontos)), 3);
  const topo = esc.topo;
  const m = { t: 10, r: 8, b: 26, l: larguraTxt(um(topo)) + 12 };
  const x0 = m.l;
  const x1 = w - m.r;
  const y0 = H - m.b;
  const y1 = m.t;
  const bw = (x1 - x0) / Math.max(1, dados.length);
  const Y = (v: number) => y0 - (v / topo) * (y0 - y1);
  const passo = Math.ceil(dados.length / 8);
  return (
    <div ref={ref} className="w-full min-w-0">
      <svg viewBox={`0 0 ${w} ${H}`} width="100%" height={H}>
        {esc.passos.map((v) => (
          <g key={v}>
            <line x1={x0} x2={x1} y1={Y(v)} y2={Y(v)} stroke={COR.grid} />
            <text {...T} x={x0 - 8} y={Y(v) + 4} textAnchor="end">{um(v)}</text>
          </g>
        ))}
        {dados.map((d, i) => {
          const larg = Math.max(2, Math.min(16, bw * 0.68));
          return (
            <g key={d.rotulo}>
              <Barra
                linhas={[{ txt: d.rotulo }, { txt: `${int(d.entregas)} entregas` }, { txt: `${um(d.pontos)} pontos` }]}
                x={x0 + bw * i + (bw - larg) / 2} y={Y(d.pontos)} width={larg} height={Math.max(1, y0 - Y(d.pontos))} rx={2} fill={COR.mint}
              />
              {i % passo === 0 && (
                <text {...T} x={x0 + bw * i + bw / 2} y={y0 + 16} textAnchor="middle">{d.curto}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export interface DadoResp {
  nome: string;
  empresas: number;
  pontos: number;
  medio: number;
  graus: number[];
}

/** Barras horizontais simples: pontos por responsável. */
export function BarrasCarga({ lista }: { lista: DadoResp[] }) {
  const [ref, w] = useLargura();
  if (!lista.length) return <div ref={ref} />;
  const H = Math.max(180, lista.length * 34 + 16);
  const lmax = Math.max(0, ...lista.map((d) => larguraTxt(d.nome)));
  const m = { t: 8, r: 62, b: 8, l: Math.min(lmax + 12, w * 0.42) };
  const x0 = m.l;
  const x1 = w - m.r;
  const alt = (H - m.t - m.b) / lista.length;
  const esc = escala(Math.max(0, ...lista.map((d) => d.pontos)), 4);
  return (
    <div ref={ref} className="w-full min-w-0">
      <svg viewBox={`0 0 ${w} ${H}`} width="100%" height={H}>
        {lista.map((d, i) => {
          const y = m.t + alt * i + alt / 2;
          const hb = Math.min(22, alt * 0.6);
          const wb = Math.max(1, (d.pontos / esc.topo) * (x1 - x0));
          return (
            <g key={d.nome}>
              <text {...A} x={x0 - 10} y={y + 4} textAnchor="end">{d.nome}</text>
              <Barra
                linhas={[{ txt: d.nome }, { txt: `${um(d.pontos)} pontos · ${int(d.empresas)} empresas` }, { txt: `ICO médio ${dois(d.medio)}` }]}
                x={x0} y={y - hb / 2} width={wb} height={hb} rx={4} fill={i === 0 ? COR.mint : COR.soft}
              />
              <text {...V} x={x0 + wb + 8} y={y + 4}>{um(d.pontos)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Barras empilhadas: empresas por grau, por responsável. */
export function BarrasEmpilhadas({ lista }: { lista: DadoResp[] }) {
  const [ref, w] = useLargura();
  if (!lista.length) return <div ref={ref} />;
  const H = Math.max(180, lista.length * 34 + 16);
  const lmax = Math.max(0, ...lista.map((d) => larguraTxt(d.nome)));
  const m = { t: 8, r: 48, b: 8, l: Math.min(lmax + 12, w * 0.42) };
  const x0 = m.l;
  const x1 = w - m.r;
  const alt = (H - m.t - m.b) / lista.length;
  const esc = escala(Math.max(0, ...lista.map((d) => d.empresas)), 4);
  return (
    <div ref={ref} className="w-full min-w-0">
      <svg viewBox={`0 0 ${w} ${H}`} width="100%" height={H}>
        {lista.map((d, i) => {
          const y = m.t + alt * i + alt / 2;
          const hb = Math.min(22, alt * 0.6);
          let acc = 0;
          return (
            <g key={d.nome}>
              <text {...A} x={x0 - 10} y={y + 4} textAnchor="end">{d.nome}</text>
              {d.graus.map((q, gr) => {
                if (!q) return null;
                const xa = x0 + (acc / esc.topo) * (x1 - x0);
                const xb = x0 + ((acc + q) / esc.topo) * (x1 - x0);
                acc += q;
                return (
                  <Barra
                    key={gr}
                    linhas={[{ txt: d.nome }, { txt: `Grau ${gr}: ${int(q)} empresa${q === 1 ? "" : "s"}`, cor: corGrau(gr) }, { txt: `total ${int(d.empresas)} empresas` }]}
                    x={xa} y={y - hb / 2} width={Math.max(1, xb - xa)} height={hb} fill={corGrau(gr)}
                  />
                );
              })}
              <text {...V} x={x0 + (d.empresas / esc.topo) * (x1 - x0) + 8} y={y + 4}>{int(d.empresas)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
