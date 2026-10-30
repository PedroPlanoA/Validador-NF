"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Modal } from "@/components/diario/Modal";
import {
  agregaDias,
  agregaPessoas,
  carteiraPorResponsavel,
  estatisticas,
  fatoresComplexidade,
  mudancaGrau,
  resumoGraus,
  type DiaEntrega,
  type EmpresaAgregada,
  type Pessoa,
  type Resumo,
} from "@/lib/ico/calculo";
import { MESES, dataBr, dois, int, pct, reais, reaisC, rotuloTri, rotuloTriLongo, um } from "@/lib/ico/formato";
import type { DB, EmpresaBase, Tri } from "@/lib/ico/tipos";
import { BarrasCarga, BarrasDia, BarrasEmpilhadas, BarrasGrupo, BarrasRealPotencial, COR, corGrau, textoGrau, useTip } from "./graficos";

// ─── Blocos de apresentação ─────────────────────────────────────────────────

const Cartao = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`bg-white border border-ink/10 rounded-card p-6 flex flex-col gap-3 min-w-0 ${className}`}>{children}</div>
);
const Nota = ({ children }: { children: ReactNode }) => <p className="text-[13px] leading-relaxed text-text-2 [&_b]:text-ink [&_b]:font-semibold">{children}</p>;

function Secao({ id, eyebrow, titulo, children, texto }: { id: string; eyebrow: string; titulo: string; texto?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="mb-14 scroll-mt-24">
      <div className="flex flex-col gap-2 mb-5">
        <span className="inline-flex items-center gap-3 text-[12px] font-semibold tracking-[.28em] uppercase text-mint before:content-[''] before:w-6 before:h-px before:bg-mint/70">
          {eyebrow}
        </span>
        <h2 className="font-serif font-black text-2xl text-deep">{titulo}</h2>
        {texto && <p className="max-w-[78ch] text-sm text-text-2 [&_b]:text-ink [&_b]:font-semibold">{texto}</p>}
      </div>
      {children}
    </section>
  );
}

const GradeCards = ({ children }: { children: ReactNode }) => (
  <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))]">{children}</div>
);

export const Kpi = ({ rotulo, valor, destaque, nota, delta, onClick, desabilitado }: {
  rotulo: string; valor: string; destaque?: boolean; nota?: string; delta?: ReactNode; onClick?: () => void; desabilitado?: boolean;
}) => {
  const corpo = (
    <>
      <span className="text-[11px] uppercase tracking-[.12em] text-text-3 font-semibold">{rotulo}</span>
      <strong className={`font-serif font-black text-[1.8rem] leading-[1.1] tracking-tight ${destaque ? "text-teal" : "text-deep"}`}>{valor}</strong>
      {delta}
      {nota && <span className="text-[12.5px] text-text-2 leading-snug">{nota}</span>}
      {onClick && !desabilitado && <span className="text-[12.5px] font-semibold text-teal">Ver empresas →</span>}
    </>
  );
  const cls = "bg-white border border-ink/10 rounded-card px-5 py-[19px] flex flex-col gap-1 shadow-card text-left";
  return onClick ? (
    <button type="button" onClick={onClick} disabled={desabilitado} className={`${cls} transition hover:enabled:-translate-y-0.5 hover:enabled:border-mint disabled:cursor-default`}>{corpo}</button>
  ) : (
    <div className={cls}>{corpo}</div>
  );
};
const GradeKpis = ({ children }: { children: ReactNode }) => (
  <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,195px),1fr))]">{children}</div>
);

export function Delta({ a, b, fmt, rotuloB, maiorMelhor = true }: { a: number; b: number | null; fmt: (v: number) => string; rotuloB: string; maiorMelhor?: boolean }) {
  if (b === null || !Number.isFinite(a) || !Number.isFinite(b)) return null;
  const d = a - b;
  const cor = Math.abs(d) < 1e-9 ? "text-text-3" : d > 0 === maiorMelhor ? "text-teal" : "text-danger";
  return <span className={`text-[13px] font-semibold ${cor}`}>{d > 0 ? "+" : ""}{fmt(d)} vs. {rotuloB}</span>;
}

const Th = ({ children, num, onClick, dir }: { children: ReactNode; num?: boolean; onClick?: () => void; dir?: "asc" | "desc" }) => (
  <th
    onClick={onClick}
    className={`sticky top-0 z-[2] px-3.5 py-3 bg-paper-alt border-b border-ink/10 text-[11px] uppercase tracking-[.1em] text-text-3 font-semibold whitespace-nowrap ${num ? "text-right" : "text-left"} ${onClick ? "cursor-pointer select-none hover:text-teal" : ""}`}
  >
    {children}{dir && <span className="ml-1 opacity-60">{dir === "asc" ? "▲" : "▼"}</span>}
  </th>
);
const Td = ({ children, num, forte, nome }: { children?: ReactNode; num?: boolean; forte?: boolean; nome?: boolean }) => (
  <td className={`px-3.5 py-[11px] text-[13.5px] border-b border-ink/[.06] ${nome ? "min-w-[180px]" : "whitespace-nowrap"} ${num ? "text-right tabular-nums" : ""} ${forte ? "font-semibold" : ""}`}>{children}</td>
);
const Tabela = ({ children, alta, className = "" }: { children: ReactNode; alta?: boolean; className?: string }) => (
  <div className={`overflow-x-auto border border-ink/10 rounded-card bg-white ${alta ? "max-h-[440px] overflow-y-auto" : ""} ${className}`}>
    <table className="w-full border-separate border-spacing-0 [&_tbody_tr:last-child_td]:border-b-0 [&_tbody_tr:hover]:bg-mint/5">{children}</table>
  </div>
);

export const BadgeGrau = ({ g }: { g: number }) => (
  <span className="inline-flex items-center text-[12px] font-semibold px-[11px] py-1 rounded-pill whitespace-nowrap" style={{ background: corGrau(g), color: textoGrau(g) }}>Grau {g}</span>
);

const Vazio = ({ titulo, texto }: { titulo: string; texto: string }) => (
  <div className="bg-white border border-ink/10 rounded-card text-center px-6 py-11 text-text-2">
    <h3 className="font-serif font-bold text-ink mb-1.5">{titulo}</h3>
    <p className="text-sm">{texto}</p>
  </div>
);

const Legenda = ({ itens }: { itens: { cor: string; txt: string; largura?: number }[] }) => (
  <div className="flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-text-2">
    {itens.map((i) => (
      <span key={i.txt} className="inline-flex items-center gap-[7px]">
        <i className="inline-block h-2.5 rounded-[3px]" style={{ background: i.cor, width: i.largura ?? 10 }} />{i.txt}
      </span>
    ))}
  </div>
);

const Mini = ({ itens }: { itens: [string, string][] }) => (
  <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(min(100%,135px),1fr))] mb-4">
    {itens.map(([l, v]) => (
      <div key={l} className="border border-ink/10 rounded-xl px-3.5 py-[11px] bg-paper">
        <div className="text-[11px] uppercase tracking-[.1em] text-text-3 font-semibold">{l}</div>
        <div className="font-serif font-black text-xl text-deep leading-tight">{v}</div>
      </div>
    ))}
  </div>
);

// ─── Indicadores principais ─────────────────────────────────────────────────

export function KpisPrincipais({ A, B, rotuloB }: { A: Resumo; B: Resumo | null; rotuloB: string }) {
  const c = A.carteira;
  const cb = B?.carteira ?? null;
  const est = estatisticas(c.empresas);
  const notaIco = est
    ? `média ${dois(c.icoMedio)} · mediana ${dois(est.mediana)} · moda ${est.modas.slice(0, 2).map(dois).join(" e ")}${est.modas.length > 2 ? "…" : ""} (${int(est.freqModa)} empresa${est.freqModa === 1 ? "" : "s"})`
    : c.nTris > 1 ? "média dos trimestres do período" : "média da carteira do trimestre";
  return (
    <>
      <GradeKpis>
        <Kpi rotulo="Carga operacional" valor={um(c.carga)} destaque
          nota={`${c.nTris > 1 ? `média de ${c.nTris} trimestres` : "pontos de ICO"} · ${int(c.nEmpresas)} empresas`}
          delta={cb ? <Delta a={c.carga} b={cb.carga} fmt={um} rotuloB={rotuloB} /> : null} />
        <Kpi rotulo="ICO médio" valor={dois(c.icoMedio)} nota={notaIco}
          delta={cb ? <Delta a={c.icoMedio} b={cb.icoMedio} fmt={dois} rotuloB={rotuloB} /> : null} />
        <Kpi rotulo="Produtividade média" valor={um(A.mediaDia)} destaque nota="pontos por dia com entrega"
          delta={B ? <Delta a={A.mediaDia} b={B.mediaDia} fmt={um} rotuloB={rotuloB} /> : null} />
        <Kpi rotulo="Aderência ao prazo" valor={pct(A.aderencia)} nota={`${int(A.nFeitas)} entregas da competência`}
          delta={B ? <Delta a={A.aderencia} b={B.aderencia} fmt={pct} rotuloB={rotuloB} /> : null} />
      </GradeKpis>
      <p className="text-[12.5px] text-text-3 mt-2.5 mb-11">
        O ICO médio é a soma dos pontos dividida pelo número de empresas da carteira, incluindo as sem movimento. A aderência usa a competência das obrigações; a produtividade usa a data da entrega. Dispensadas ficam fora de tudo.
      </p>
    </>
  );
}

// ─── Complexidade ───────────────────────────────────────────────────────────

export function Complexidade({ emp }: { emp: EmpresaAgregada[] }) {
  const { dados, somaPesos } = useMemo(() => fatoresComplexidade(emp), [emp]);
  const fora = dados.filter((d) => d.observado > d.max + 1e-9);
  const baixo = dados.filter((d) => emp.length && d.observado > 0 && d.observado < d.max - 1e-9);
  let msg = `Soma dos pesos: ${um(somaPesos)}.`;
  if (fora.length) msg += ` Atenção: ${fora.map((d) => `${d.rotulo} chega a ${um(d.observado)}`).join(", ")}, acima do teto configurado.`;
  if (baixo.length) msg += ` Nenhuma empresa atingiu o teto em: ${baixo.map((d) => `${d.rotulo} (máx. ${um(d.observado)})`).join(", ")}.`;
  return (
    <Secao id="s-complex" eyebrow="Complexidade" titulo="De onde vem a carga"
      texto={<>Cada atividade entra no ICO com um peso diferente, então a mesma pontuação não vale o mesmo em todas. O gráfico compara o que cada atividade <b>representa hoje</b> na carga com o que ela <b>poderia representar</b> se todas as empresas atingissem o teto dela.</>}>
      <GradeCards>
        <Cartao>
          <h3 className="font-serif font-bold text-base">Participação real contra potencial</h3>
          <Legenda itens={[{ cor: COR.mint, txt: "Participação na carga" }, { cor: COR.muted, txt: "Potencial pelo peso" }]} />
          <BarrasRealPotencial dados={dados} />
        </Cartao>
        <Cartao>
          <h3 className="font-serif font-bold text-base">Peso</h3>
          <Nota>O <b>potencial</b> é a fatia do ICO que a atividade pode ocupar pelo seu peso. A <b>participação</b> é a fatia que ela ocupa hoje.</Nota>
          <Tabela>
            <thead><tr><Th>Atividade</Th><Th num>Peso máx.</Th><Th num>Potencial</Th><Th num>Pontos</Th><Th num>Participação</Th></tr></thead>
            <tbody>
              {dados.map((d) => (
                <tr key={d.rotulo}><Td forte>{d.rotulo}</Td><Td num>{um(d.max)}</Td><Td num>{pct(d.potencial)}</Td><Td num forte>{um(d.pontos)}</Td><Td num>{pct(d.real)}</Td></tr>
              ))}
            </tbody>
          </Tabela>
          <Nota>{msg}</Nota>
        </Cartao>
      </GradeCards>
    </Secao>
  );
}

// ─── Grau ───────────────────────────────────────────────────────────────────

export function GrauCarteira({ emp }: { emp: EmpresaAgregada[] }) {
  const graus = useMemo(() => resumoGraus(emp), [emp]);
  const carga = emp.reduce((c, e) => c + e.pontos, 0);
  const alto = graus.filter((g) => g.grau >= 3);
  const nAlto = alto.reduce((s, g) => s + g.empresas, 0);
  const pAlto = alto.reduce((s, g) => s + g.pontos, 0);
  return (
    <Secao id="s-grau" eyebrow="Carteira" titulo="Concentração por grau"
      texto="O grau é o arredondamento dos pontos de ICO. A leitura que importa é a diferença entre a fatia de empresas e a fatia de carga de cada grau.">
      <GradeCards>
        <Cartao>
          <h3 className="font-serif font-bold text-base">Empresas e carga por grau</h3>
          <Legenda itens={[{ cor: "linear-gradient(90deg,#DCEFE9,#00323C)", txt: "Empresas, do grau 0 ao 5", largura: 46 }, { cor: COR.clay, txt: "Pontos de ICO" }]} />
          <BarrasGrupo dados={graus.map((g) => ({
            grau: g.grau, rotulo: g.rotulo, shareEmp: g.shareEmp, shareCarga: g.shareCarga,
            extraA: `${int(g.empresas)} (${pct(g.shareEmp)})`, extraB: `${um(g.pontos)} (${pct(g.shareCarga)})`,
          }))} />
        </Cartao>
        <Cartao>
          <h3 className="font-serif font-bold text-base">Distribuição</h3>
          <Nota>
            {emp.length
              ? `Graus 3 a 5 são ${int(nAlto)} empresas (${pct(nAlto / emp.length)}) e carregam ${um(pAlto)} pontos (${pct(carga ? pAlto / carga : 0)} da carga).`
              : "Sem base lançada para este período."}
          </Nota>
          <Tabela>
            <thead><tr><Th>Grau</Th><Th num>Empresas</Th><Th num>% empresas</Th><Th num>Pontos</Th><Th num>% da carga</Th><Th num>ICO médio</Th></tr></thead>
            <tbody>
              {graus.map((g) => (
                <tr key={g.grau}><Td><BadgeGrau g={g.grau} /></Td><Td num>{int(g.empresas)}</Td><Td num>{pct(g.shareEmp)}</Td><Td num forte>{um(g.pontos)}</Td><Td num>{pct(g.shareCarga)}</Td><Td num>{dois(g.medio)}</Td></tr>
              ))}
            </tbody>
          </Tabela>
        </Cartao>
      </GradeCards>
    </Secao>
  );
}

// ─── Responsáveis ───────────────────────────────────────────────────────────

export function PorResponsavel({ db, emp, tris }: { db: DB; emp: EmpresaAgregada[]; tris: Tri[] }) {
  const lista = useMemo(() => carteiraPorResponsavel(db, emp, tris), [db, emp, tris]);
  return (
    <Secao id="s-resp" eyebrow="Carteira" titulo="Peso da carteira por responsável"
      texto={lista.length ? 'A base de dados não traz o responsável, então ele vem do campo "Responsável prazo" das obrigações do período — quem mais aparece em cada empresa.' : "Sem base lançada para este período."}>
      <GradeCards>
        <Cartao>
          <h3 className="font-serif font-bold text-base">Pontos de ICO por responsável</h3>
          <Nota>A carga que cada carteira carrega, em pontos. O número de empresas, sozinho, esconde isso.</Nota>
          <BarrasCarga lista={lista} />
        </Cartao>
        <Cartao>
          <h3 className="font-serif font-bold text-base">Empresas por grau</h3>
          <Nota>Quantas empresas de cada grau há em cada carteira. A cor escurece conforme o grau sobe.</Nota>
          <Legenda itens={[0, 1, 2, 3, 4, 5].map((g) => ({ cor: corGrau(g), txt: `Grau ${g}` }))} />
          <BarrasEmpilhadas lista={lista} />
        </Cartao>
      </GradeCards>
      <Tabela className="mt-4">
        <thead>
          <tr><Th>Responsável</Th><Th num>Empresas</Th><Th num>Pontos</Th><Th num>ICO médio</Th>{[0, 1, 2, 3, 4, 5].map((g) => <Th key={g} num>Grau {g}</Th>)}</tr>
        </thead>
        <tbody>
          {lista.map((r) => (
            <tr key={r.nome}>
              <Td forte>{r.nome}</Td><Td num>{int(r.empresas)}</Td><Td num forte>{um(r.pontos)}</Td><Td num>{dois(r.medio)}</Td>
              {r.graus.map((q, i) => <Td key={i} num>{q ? int(q) : "—"}</Td>)}
            </tr>
          ))}
        </tbody>
      </Tabela>
    </Secao>
  );
}

// ─── Empresas ───────────────────────────────────────────────────────────────

type ChaveEmp = "id" | "nome" | "regime" | "honMes" | "entradas" | "saidas" | "servicos" | "faturamento" | "obrigacoes" | "atendimento" | "pontos" | "grau";

export function TabelaEmpresas({ emp }: { emp: EmpresaAgregada[] }) {
  const [q, setQ] = useState("");
  const [fg, setFg] = useState("");
  const [fr, setFr] = useState("");
  const [ord, setOrd] = useState<{ k: ChaveEmp; dir: "asc" | "desc" }>({ k: "pontos", dir: "desc" });

  const regimes = useMemo(() => [...new Set(emp.map((e) => e.regime).filter(Boolean))].sort(), [emp]);
  const linhas = useMemo(() => {
    const termo = q.trim().toLowerCase();
    const s = ord.dir === "asc" ? 1 : -1;
    return emp
      .filter((e) => (fg === "" || String(e.grau) === fg) && (fr === "" || e.regime === fr) && (!termo || `${e.nome} ${e.id}`.toLowerCase().includes(termo)))
      .sort((a, b) => {
        const va = ord.k === "id" ? Number(a.id) : a[ord.k];
        const vb = ord.k === "id" ? Number(b.id) : b[ord.k];
        if (typeof va === "string" || typeof vb === "string") return String(va).localeCompare(String(vb), "pt-BR") * s;
        return ((va as number) - (vb as number)) * s;
      });
  }, [emp, q, fg, fr, ord]);

  const cab = (k: ChaveEmp, rotulo: string, num?: boolean) => (
    <Th num={num} dir={ord.k === k ? ord.dir : undefined}
      onClick={() => setOrd((o) => (o.k === k ? { k, dir: o.dir === "asc" ? "desc" : "asc" } : { k, dir: k === "nome" || k === "regime" ? "asc" : "desc" }))}>
      {rotulo}
    </Th>
  );
  const campo = "font-sans text-sm px-3 py-2 border border-ink/10 rounded-[10px] bg-white outline-none focus:border-mint focus:ring-2 focus:ring-mint/15";
  return (
    <Secao id="s-pesadas" eyebrow="Carteira" titulo="As empresas mais pesadas"
      texto="Ordenadas por pontos de ICO. Os honorários são o valor mensal, apurado sobre o que foi pago no trimestre.">
      <div className="flex flex-wrap gap-2.5 items-center mb-3">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por empresa ou ID" aria-label="Buscar empresa" className={`${campo} flex-1 basis-[200px] min-w-0`} />
        <select value={fg} onChange={(e) => setFg(e.target.value)} className={campo} aria-label="Filtrar por grau">
          <option value="">Todos os graus</option>
          {[0, 1, 2, 3, 4, 5].map((g) => { const n = emp.filter((e) => e.grau === g).length; return n ? <option key={g} value={g}>Grau {g} ({n})</option> : null; })}
        </select>
        <select value={fr} onChange={(e) => setFr(e.target.value)} className={campo} aria-label="Filtrar por regime">
          <option value="">Todos os regimes</option>
          {regimes.map((r) => <option key={r} value={r}>{r} ({emp.filter((e) => e.regime === r).length})</option>)}
        </select>
        <span className="text-[13px] text-text-3 ml-auto">{linhas.length === emp.length ? `${int(linhas.length)} empresas` : `${int(linhas.length)} de ${int(emp.length)} empresas`}</span>
      </div>
      <Tabela alta>
        <thead>
          <tr>
            {cab("id", "ID", true)}{cab("nome", "Empresa")}{cab("regime", "Regime")}{cab("honMes", "Honorários/mês", true)}
            {cab("entradas", "Entradas", true)}{cab("saidas", "Saídas", true)}{cab("servicos", "Serviços", true)}
            {cab("faturamento", "Faturamento", true)}{cab("obrigacoes", "Obrig.", true)}{cab("atendimento", "Atend.", true)}
            {cab("pontos", "ICO", true)}{cab("grau", "Grau")}
          </tr>
        </thead>
        <tbody>
          {linhas.map((e) => (
            <tr key={e.id}>
              <Td num>{e.id}</Td><Td nome forte>{e.nome}</Td><Td>{e.regime || "—"}</Td><Td num>{reais(e.honMes)}</Td>
              <Td num>{int(e.entradas)}</Td><Td num>{int(e.saidas)}</Td><Td num>{int(e.servicos)}</Td>
              <Td num>{reaisC(e.faturamento)}</Td><Td num>{int(e.obrigacoes)}</Td><Td num>{int(e.atendimento)}</Td>
              <Td num forte>{um(e.pontos)}</Td><Td><BadgeGrau g={e.grau} /></Td>
            </tr>
          ))}
        </tbody>
      </Tabela>
    </Secao>
  );
}

// ─── Mudança de grau ────────────────────────────────────────────────────────

export function MudancaDeGrau({ db, trisA, trisB }: { db: DB; trisA: Tri[]; trisB: Tri[] | null }) {
  const m = useMemo(() => mudancaGrau(db, trisA, trisB), [db, trisA, trisB]);
  const [lista, setLista] = useState<{ titulo: string; empresas: EmpresaBase[] } | null>(null);
  if (!m) {
    return (
      <Secao id="s-mud" eyebrow="Evolução" titulo="Quem mudou de grau"
        texto={trisB ? "Os dois períodos comparados precisam ter base lançada." : "Não há trimestre anterior lançado para comparar."}>
        <Vazio titulo="Sem par para comparar" texto="Importe a base de outro trimestre, ou ative a comparação no topo e escolha dois períodos lançados." />
      </Secao>
    );
  }
  return (
    <Secao id="s-mud" eyebrow="Evolução" titulo="Quem mudou de grau" texto={`Comparando ${rotuloTriLongo(m.alvo)} com ${rotuloTriLongo(m.ref)}.`}>
      <GradeKpis>
        <Kpi rotulo="Subiram de grau" valor={int(m.subiu.length)} destaque nota="ficaram mais complexas" />
        <Kpi rotulo="Desceram de grau" valor={int(m.desceu.length)} nota="ficaram menos complexas" />
        <Kpi rotulo="Entraram na base" valor={int(m.novos.length)} nota={`sem registro em ${rotuloTri(m.ref)}`}
          onClick={() => setLista({ titulo: `Empresas que entraram em ${rotuloTriLongo(m.alvo)}`, empresas: m.novos })} desabilitado={!m.novos.length} />
        <Kpi rotulo="Saíram da base" valor={int(m.sairam.length)} nota={`estavam em ${rotuloTri(m.ref)}`}
          onClick={() => setLista({ titulo: `Empresas que saíram desde ${rotuloTriLongo(m.ref)}`, empresas: m.sairam })} desabilitado={!m.sairam.length} />
      </GradeKpis>
      {!m.subiu.length && !m.desceu.length ? (
        <div className="mt-4"><Vazio titulo="Nenhuma empresa mudou de grau" texto="A carteira manteve a mesma distribuição entre os dois períodos." /></div>
      ) : (
        <div className="mt-4"><GradeCards>
          {([["Subiram", m.subiu], ["Desceram", m.desceu]] as const).map(([titulo, itens]) => (
            <Cartao key={titulo}>
              <h3 className="font-serif font-bold text-base">{titulo} ({itens.length})</h3>
              {!itens.length ? <Nota>Nenhuma empresa.</Nota> : (
                <Tabela alta>
                  <thead><tr><Th num>ID</Th><Th>Empresa</Th><Th num>De</Th><Th num>Para</Th><Th num>Δ ICO</Th></tr></thead>
                  <tbody>
                    {itens.map((x) => (
                      <tr key={x.e.id}>
                        <Td num>{x.e.id}</Td><Td nome forte>{x.e.nome}</Td><Td num><BadgeGrau g={x.de} /></Td><Td num><BadgeGrau g={x.para} /></Td>
                        <Td num forte><span className={x.dp > 0 ? "text-danger" : "text-teal"}>{x.dp > 0 ? "+" : ""}{um(x.dp)}</span></Td>
                      </tr>
                    ))}
                  </tbody>
                </Tabela>
              )}
            </Cartao>
          ))}
        </GradeCards></div>
      )}
      {lista && <PopupEmpresas titulo={lista.titulo} empresas={lista.empresas} onFechar={() => setLista(null)} />}
    </Secao>
  );
}

function PopupEmpresas({ titulo, empresas, onFechar }: { titulo: string; empresas: EmpresaBase[]; onFechar: () => void }) {
  const soma = empresas.reduce((s, e) => s + e.pontos, 0);
  return (
    <Modal titulo={titulo} onFechar={onFechar} largura="max-w-3xl">
      <Mini itens={[["Empresas", int(empresas.length)], ["Pontos somados", um(soma)], ["ICO médio", dois(empresas.length ? soma / empresas.length : 0)]]} />
      <Tabela alta>
        <thead><tr><Th num>ID</Th><Th>Empresa</Th><Th>Regime</Th><Th num>ICO</Th><Th>Grau</Th></tr></thead>
        <tbody>
          {empresas.map((e) => (
            <tr key={e.id}><Td num>{e.id}</Td><Td nome forte>{e.nome}</Td><Td>{e.regime || "—"}</Td><Td num forte>{um(e.pontos)}</Td><Td><BadgeGrau g={e.grau} /></Td></tr>
          ))}
        </tbody>
      </Tabela>
    </Modal>
  );
}

// ─── Produção ───────────────────────────────────────────────────────────────

const PAL = ["#bfe8e1", "#8ed9ce", "#4ec6b5", "#1fb8a3", "#007878"];

export function Producao({ A, B, rotuloB }: { A: Resumo; B: Resumo | null; rotuloB: string }) {
  const [aba, setAba] = useState<"setor" | "pessoa">("setor");
  const [dia, setDia] = useState<DiaEntrega | null>(null);
  const [pessoa, setPessoa] = useState<Pessoa | null>(null);
  const pessoas = useMemo(() => agregaPessoas(A.entregas, A.icoMap), [A]);
  const tab = (id: typeof aba, rotulo: string) => (
    <button role="tab" aria-selected={aba === id} onClick={() => setAba(id)}
      className={`font-sans text-sm font-semibold px-[18px] py-2 rounded-pill transition ${aba === id ? "bg-white text-deep shadow-card" : "text-text-2"}`}>{rotulo}</button>
  );
  return (
    <Secao id="s-entregas" eyebrow="Produção" titulo="Entregas por dia"
      texto="Uma empresa conta como entregue no dia em que a última obrigação do mês dela saiu. Cada empresa entregue soma os pontos de ICO que ela tem no período. Dispensadas ficam fora de tudo.">
      <div role="tablist" className="inline-flex gap-1 p-1 bg-paper-alt rounded-pill mb-4">{tab("setor", "Setor")}{tab("pessoa", "Por pessoa")}</div>
      {aba === "setor" ? (
        <>
          <GradeKpis>
            <Kpi rotulo="Empresas entregues" valor={int(A.entregas.length)} nota={`${int(A.distintas)} empresas distintas no período`}
              delta={B ? <Delta a={A.entregas.length} b={B.entregas.length} fmt={int} rotuloB={rotuloB} /> : null} />
            <Kpi rotulo="Produção" valor={um(A.producao)} destaque nota="pontos de ICO entregues"
              delta={B ? <Delta a={A.producao} b={B.producao} fmt={um} rotuloB={rotuloB} /> : null} />
            <Kpi rotulo="Média diária" valor={um(A.mediaDia)} destaque nota="pontos por dia com entrega"
              delta={B ? <Delta a={A.mediaDia} b={B.mediaDia} fmt={um} rotuloB={rotuloB} /> : null} />
            <Kpi rotulo="Entregas por dia" valor={int(A.entregasDia)} nota="empresas por dia com entrega"
              delta={B ? <Delta a={Math.round(A.entregasDia)} b={Math.round(B.entregasDia)} fmt={int} rotuloB={rotuloB} /> : null} />
          </GradeKpis>
          <Cartao className="mt-4">
            <h3 className="font-serif font-bold text-base">Calendário de entregas</h3>
            <Nota>A cor indica os pontos de ICO entregues no dia. Clique num dia para ver as empresas.</Nota>
            <Calendario dias={A.dias} onDia={setDia} />
          </Cartao>
        </>
      ) : (
        <>
          <p className="text-[13px] text-text-2 mb-3.5">A média diária considera apenas os dias em que a pessoa teve entrega. Clique num card para abrir o detalhe.</p>
          {!pessoas.length ? <Vazio titulo="Sem entregas no período" texto="Ninguém concluiu empresas neste período." /> : (
            <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))]">
              {pessoas.map((p) => (
                <button key={p.nome} type="button" onClick={() => setPessoa(p)}
                  className="border border-ink/10 rounded-card bg-white px-5 py-[18px] text-left transition hover:-translate-y-0.5 hover:border-mint hover:shadow-card">
                  <div className="flex items-center gap-[11px] mb-3">
                    <div className="w-9 h-9 rounded-full bg-deep text-white flex items-center justify-center font-bold text-sm shrink-0">{(p.nome[0] || "?").toUpperCase()}</div>
                    <div className="font-semibold text-[15px] truncate">{p.nome}</div>
                  </div>
                  <div className="flex flex-col gap-[5px]">
                    <LinhaP l="ICO médio" v={dois(p.icoMedio)} big />
                    <LinhaP l="Média diária" v={`${um(p.mediaDia)} pts`} />
                    <LinhaP l="Produção" v={`${um(p.pontos)} pts`} />
                    <LinhaP l="Entregas" v={int(p.entregas)} />
                    <LinhaP l="Aderência" v={pct(p.aderencia)} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
      {dia && <PopupDia dia={dia} icoMap={A.icoMap} onFechar={() => setDia(null)} />}
      {pessoa && <PopupPessoa p={pessoa} A={A} onFechar={() => setPessoa(null)} />}
    </Secao>
  );
}

const LinhaP = ({ l, v, big }: { l: string; v: string; big?: boolean }) => (
  <div className="flex justify-between gap-2.5 text-[13px] text-text-2">
    <span>{l}</span>
    <b className={big ? "font-serif font-black text-lg text-teal leading-none" : "font-semibold text-ink"}>{v}</b>
  </div>
);

function Calendario({ dias, onDia }: { dias: DiaEntrega[]; onDia: (d: DiaEntrega) => void }) {
  const { mostra, esconde } = useTip();
  if (!dias.length) return <Vazio titulo="Sem entregas no período" texto="Nenhuma empresa foi concluída com data dentro do período selecionado." />;
  const mapa: Record<string, DiaEntrega> = {};
  let maxP = 0;
  for (const d of dias) {
    mapa[d.dia] = d;
    if (d.pontos > maxP) maxP = d.pontos;
  }
  const cor = (p: number) => { if (!p) return PAL[0]; const t = Math.min(1, p / maxP); return PAL[t <= 0.2 ? 0 : t <= 0.4 ? 1 : t <= 0.6 ? 2 : t <= 0.8 ? 3 : 4]; };
  const meses: Record<string, { ano: number; mes: number; entregas: number; pontos: number }> = {};
  for (const d of dias) {
    const k = d.d.toISOString().slice(0, 7);
    const m = (meses[k] ||= { ano: d.d.getUTCFullYear(), mes: d.d.getUTCMonth(), entregas: 0, pontos: 0 });
    m.entregas += d.entregas;
    m.pontos += d.pontos;
  }
  return (
    <>
      <div className="flex items-center gap-2 text-[12px] text-text-3 flex-wrap">
        <span>menos</span><span className="flex gap-0.5">{PAL.map((c) => <i key={c} className="block w-[15px] h-[11px] rounded-[2px]" style={{ background: c }} />)}</span><span>mais</span>
        <span className="ml-auto">máximo no dia: {um(maxP)} pontos</span>
      </div>
      <div className="grid gap-[18px] grid-cols-[repeat(auto-fit,minmax(min(100%,245px),1fr))]">
        {Object.keys(meses).sort().map((k) => {
          const M = meses[k];
          const off = new Date(Date.UTC(M.ano, M.mes, 1)).getUTCDay();
          const nd = new Date(Date.UTC(M.ano, M.mes + 1, 0)).getUTCDate();
          return (
            <div key={k} className="border border-ink/10 rounded-[14px] p-3.5 bg-white">
              <h4 className="text-sm font-bold capitalize mb-0.5">{MESES[M.mes]} de {M.ano}</h4>
              <div className="text-[12px] text-text-3 mb-2.5">{int(M.entregas)} entregas · {um(M.pontos)} pontos</div>
              <div className="grid grid-cols-7 gap-[3px] mb-1">{["d", "s", "t", "q", "q", "s", "s"].map((x, i) => <span key={i} className="text-[10px] text-center text-text-3 font-semibold uppercase">{x}</span>)}</div>
              <div className="grid grid-cols-7 gap-[3px]">
                {Array.from({ length: off }, (_, i) => <div key={`o${i}`} />)}
                {Array.from({ length: nd }, (_, i) => {
                  const n = i + 1;
                  const ds = new Date(Date.UTC(M.ano, M.mes, n)).toISOString().slice(0, 10);
                  const info = mapa[ds];
                  if (!info) return <div key={n} className="aspect-square rounded-[5px] flex items-center justify-center text-[11px] font-semibold bg-ink/[.04] text-text-3">{n}</div>;
                  return (
                    <button key={n} type="button" aria-label={`${n} — ${info.entregas} entregas`}
                      onClick={() => { esconde(); onDia(info); }}
                      onMouseMove={(e) => mostra([{ txt: dataBr(ds) }, { txt: `${int(info.entregas)} entregas` }, { txt: `${um(info.pontos)} pontos de ICO` }, { txt: `${pct(info.entregas ? info.noPrazo / info.entregas : 0)} no prazo` }], e)}
                      onMouseLeave={esconde}
                      className="aspect-square rounded-[5px] flex items-center justify-center text-[11px] font-semibold text-white transition hover:scale-[1.15] hover:z-[2]"
                      style={{ background: cor(info.pontos) }}>{n}</button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function PopupDia({ dia, icoMap, onFechar }: { dia: DiaEntrega; icoMap: Record<string, number>; onFechar: () => void }) {
  const itens = [...dia.itens].sort((a, b) => (icoMap[b.id] || 0) - (icoMap[a.id] || 0));
  return (
    <Modal titulo={`Entregas de ${dataBr(dia.dia)}`} onFechar={onFechar} largura="max-w-4xl">
      <Mini itens={[["Entregas", int(dia.entregas)], ["Pontos de ICO", um(dia.pontos)], ["No prazo", pct(dia.entregas ? dia.noPrazo / dia.entregas : 0)], ["Empresas", int(new Set(dia.itens.map((o) => o.id)).size)]]} />
      <Tabela alta>
        <thead><tr><Th num>ID</Th><Th>Empresa</Th><Th>Competência</Th><Th>Obrigações</Th><Th num>ICO</Th><Th>Prazo</Th><Th>Responsável</Th></tr></thead>
        <tbody>
          {itens.map((e) => (
            <tr key={`${e.id}|${e.mes}`}>
              <Td num>{e.id}</Td><Td nome forte>{e.empresa}</Td><Td>{e.mes.split("-").reverse().join("/")}</Td>
              <Td>{e.itens.map((o) => o.tarefa).join(" + ")}</Td><Td num forte>{um(icoMap[e.id] || 0)}</Td>
              <Td><span className={`inline-flex text-[12px] font-semibold px-[11px] py-1 rounded-pill ${e.todasNoPrazo ? "bg-mint/15 text-[#0d7d6e]" : "bg-clay/15 text-[#a85a33]"}`}>{e.todasNoPrazo ? "No prazo" : "Com atraso"}</span></Td>
              <Td>{e.resp || "—"}</Td>
            </tr>
          ))}
        </tbody>
      </Tabela>
    </Modal>
  );
}

function PopupPessoa({ p, A, onFechar }: { p: Pessoa; A: Resumo; onFechar: () => void }) {
  const dias = useMemo(() => agregaDias(A.entregas.filter((e) => (e.resp || "Sem responsável") === p.nome), A.icoMap), [A, p]);
  return (
    <Modal titulo={p.nome} onFechar={onFechar} largura="max-w-4xl">
      <Mini itens={[
        ["ICO médio", dois(p.icoMedio)], ["Produção", `${um(p.pontos)} pts`], ["Média diária", `${um(p.mediaDia)} pts`], ["Entregas", int(p.entregas)],
        ["Entregas por dia", int(p.mediaEntregas)], ["Dias com entrega", int(p.qtdDias)], ["Aderência ao prazo", pct(p.aderencia)], ["Empresas atendidas", int(p.empresas)],
      ]} />
      <h4 className="font-serif font-bold text-[15px]">Produção por dia</h4>
      <div className="my-2 mb-4">
        <BarrasDia dados={dias.map((x) => ({ pontos: x.pontos, entregas: x.entregas, rotulo: dataBr(x.dia), curto: `${x.dia.slice(8)}/${x.dia.slice(5, 7)}` }))} />
      </div>
      <Tabela alta>
        <thead><tr><Th>Dia</Th><Th num>Entregas</Th><Th num>Pontos</Th><Th num>No prazo</Th></tr></thead>
        <tbody>
          {[...dias].reverse().map((x) => (
            <tr key={x.dia}><Td forte>{dataBr(x.dia)}</Td><Td num>{int(x.entregas)}</Td><Td num forte>{um(x.pontos)}</Td><Td num>{pct(x.entregas ? x.noPrazo / x.entregas : 0)}</Td></tr>
          ))}
        </tbody>
      </Tabela>
    </Modal>
  );
}

// ─── Metodologia e rodapé ───────────────────────────────────────────────────

export function Metodologia({ nTris }: { nTris: number }) {
  return (
    <Secao id="s-metodo" eyebrow="Metodologia" titulo="Como cada número é apurado">
      <GradeCards>
        <Cartao>
          <h3 className="font-serif font-bold text-base">Vocabulário</h3>
          <ul className="pl-[1.15em] list-disc text-[13.5px] text-text-2 space-y-1.5 [&_b]:text-ink">
            <li><b>ICO</b> — a nota de complexidade da empresa, de 0 a 5, com uma casa decimal.</li>
            <li><b>Grau</b> — o arredondamento do ICO, de 0 a 5.</li>
            <li><b>Ponto</b> — a unidade do ICO quando se soma a carteira.</li>
            <li><b>Produção</b> — os pontos de ICO que viraram entrega no período.</li>
          </ul>
        </Cartao>
        <Cartao>
          <h3 className="font-serif font-bold text-base">Competência e data de entrega</h3>
          <Nota>A <b>aderência</b> olha as obrigações cuja competência cai no período — o que era devido.</Nota>
          <Nota><b>Calendário</b>, <b>produção</b> e <b>média diária</b> olham a data em que a entrega foi feita. Uma obrigação de janeiro entregue em março aparece em março.</Nota>
          <Nota>Por isso os dois blocos não fecham com o mesmo total.</Nota>
        </Cartao>
        <Cartao>
          <h3 className="font-serif font-bold text-base">O que conta como entrega</h3>
          <Nota>As obrigações de referência são <b>DAS - Mensal</b> e <b>DARF - COFINS</b>. Uma empresa entra na contagem do dia quando a última obrigação daquela competência saiu — na prática cada empresa tem uma das duas por mês, raramente as duas.</Nota>
          <Nota>Por isso o painel conta <b>empresas entregues</b>, não linhas de obrigação: o que se mede é quantas empresas foram fechadas no dia.</Nota>
        </Cartao>
        <Cartao>
          <h3 className="font-serif font-bold text-base">Médias do período</h3>
          <Nota>{nTris > 1 ? `Este período reúne ${nTris} trimestres lançados, então carga e ICO médio são a média entre eles.` : "Este período tem um trimestre lançado, então os números são dele."}</Nota>
          <Nota>Quando o período reúne mais de um trimestre, carga, ICO médio e número de empresas são a <b>média dos trimestres</b>, nunca a soma. As entregas, essas sim, somam o período inteiro.</Nota>
          <Nota>Empresas presentes nas obrigações mas ausentes da base entram com ICO zero.</Nota>
        </Cartao>
      </GradeCards>
    </Secao>
  );
}

export function Rodape({ db, nTris }: { db: DB; nTris: number }) {
  const lanc = Object.keys(db.bases).sort().map(rotuloTri).join(", ") || "nenhuma";
  return (
    <footer className="border-t border-ink/10 pt-5 mt-2 text-[13px] text-text-3 flex flex-wrap gap-x-6 gap-y-2">
      <span>Bases lançadas: {lanc}</span>
      <span>Obrigações: {int(db.totalObr)} linhas</span>
      <span>Trimestres no período: {nTris}</span>
      <span>Plano A Contabilidade</span>
    </footer>
  );
}


