"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Download, Loader2, Upload, X } from "lucide-react";
import { Modal } from "@/components/diario/Modal";
import { Button } from "@/components/ui/Button";
import { montarDB, resumo, todosTris, trisVisiveis } from "@/lib/ico/calculo";
import { rotuloTri, rotuloTriLongo } from "@/lib/ico/formato";
import { linhasDaPlanilha, parseCsv, reconhece } from "@/lib/ico/leitura";
import type { Arquivo, Tri } from "@/lib/ico/tipos";
import { BaixarArquivo } from "./BaixarArquivo";
import { TipProvider } from "./graficos";
import { Complexidade, GrauCarteira, KpisPrincipais, Metodologia, MudancaDeGrau, PorResponsavel, Producao, Rodape, TabelaEmpresas } from "./SecoesIco";

interface Retorno {
  nome: string;
  ok: boolean;
  detalhe: string;
}

const MODELO = "/modelos/modelo-dados-ico-fiscal.xlsx";
const NOME_MODELO = "Dados - modelo ICO Fiscal.xlsx";

const NOMES_ABAS = ["base de dados", "obrigacoes acessorias"];
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Lê um arquivo do disco e devolve as partes reconhecidas (um CSV, ou as abas relevantes de uma planilha). */
async function lerArquivo(f: File): Promise<{ nome: string; linhas: string[][] }[]> {
  const ext = f.name.split(".").pop()?.toLowerCase();
  if (ext === "xlsx" || ext === "xls") {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await f.arrayBuffer(), { type: "array" });
    let abas = wb.SheetNames.filter((n) => NOMES_ABAS.includes(norm(n)));
    if (!abas.length) abas = wb.SheetNames.slice(0, 1);
    return abas.map((n) => ({
      nome: `${f.name} › ${n}`,
      linhas: linhasDaPlanilha(XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[n], { header: 1, raw: true, defval: "" })),
    }));
  }
  return [{ nome: f.name, linhas: parseCsv(await f.text()) }];
}

export function PainelIco() {
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [lendo, setLendo] = useState(false);
  const [retornos, setRetornos] = useState<Retorno[]>([]);
  const [menu, setMenu] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  // null = ainda não escolhido: vale o padrão (último trimestre lançado, comparado com o anterior).
  const [anoE, setAno] = useState<string | null>(null);
  const [triE, setTri] = useState<string | null>(null);
  const [ano2E, setAno2] = useState<string | null>(null);
  const [tri2E, setTri2] = useState<string | null>(null);
  const [soLanc, setSoLanc] = useState(false);
  const [comparar, setComparar] = useState(false);

  useEffect(() => {
    fetch("/api/ico-fiscal", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Falha ao carregar os arquivos."))))
      .then((d: { arquivos: Arquivo[] }) => setArquivos(d.arquivos))
      .catch((e: Error) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, []);

  const db = useMemo(() => montarDB(arquivos), [arquivos]);
  const todos = useMemo(() => todosTris(db), [db]);
  const visiveis = useMemo(() => trisVisiveis(db, soLanc), [db, soLanc]);

  const padrao = useMemo(() => {
    const comBase = todos.filter((t) => db.bases[t]);
    const alvo = (comBase.length ? comBase : todos).at(-1)?.split("-T") ?? ["TODOS", "TODOS"];
    const ant = comBase.length > 1 ? comBase.at(-2)!.split("-T") : ["TODOS", "TODOS"];
    return { ano: alvo[0], tri: alvo[1], ano2: ant[0], tri2: ant[1] };
  }, [todos, db]);
  const ano = anoE ?? padrao.ano;
  const tri = triE ?? padrao.tri;
  const ano2 = ano2E ?? padrao.ano2;
  const tri2 = tri2E ?? padrao.tri2;

  const anos = useMemo(() => [...new Set((visiveis.length ? visiveis : todos).map((t) => t.split("-T")[0]))].sort(), [visiveis, todos]);
  const nums = useMemo(() => [...new Set((visiveis.length ? visiveis : todos).map((t) => t.split("-T")[1]))].sort(), [visiveis, todos]);

  const periodo = useCallback((a: string, t: string): Tri[] => visiveis.filter((x) => {
    const [xa, xt] = x.split("-T");
    return (a === "TODOS" || xa === a) && (t === "TODOS" || xt === t);
  }), [visiveis]);
  const rotuloPeriodo = (tris: Tri[], a: string, t: string) => {
    if (!tris.length) return "Sem dados no período";
    if (tris.length === 1) return rotuloTriLongo(tris[0]);
    if (a === "TODOS" && t === "TODOS") return "Todos os trimestres";
    if (a !== "TODOS" && t === "TODOS") return `Ano de ${a}`;
    if (a === "TODOS") return `${t}º trimestre de todos os anos`;
    return rotuloTriLongo(tris[0]);
  };

  const trisA = useMemo(() => periodo(ano, tri), [periodo, ano, tri]);
  const trisB = useMemo(() => (comparar ? periodo(ano2, tri2) : null), [comparar, periodo, ano2, tri2]);
  const A = useMemo(() => resumo(db, trisA), [db, trisA]);
  const B = useMemo(() => (trisB ? resumo(db, trisB) : null), [db, trisB]);
  const rotuloB = trisB ? (trisB.length === 1 ? rotuloTri(trisB[0]) : rotuloPeriodo(trisB, ano2, tri2).toLowerCase()) : "";

  async function receber(lista: FileList | File[]) {
    setLendo(true);
    setErro(null);
    const novos: Retorno[] = [];
    let atual = arquivos;
    try {
      for (const f of Array.from(lista)) {
        let partes: { nome: string; linhas: string[][] }[];
        try {
          partes = await lerArquivo(f);
        } catch {
          novos.push({ nome: f.name, ok: false, detalhe: "Falha na leitura do arquivo." });
          continue;
        }
        let algum = false;
        for (const p of partes) {
          const lido = reconhece(p.linhas);
          if (!lido) continue;
          algum = true;
          if (atual.some((a) => a.nome === p.nome)) {
            novos.push({ nome: p.nome, ok: false, detalhe: "Já importado — remova antes de reimportar." });
            continue;
          }
          const r = await fetch("/api/ico-fiscal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome: p.nome, tipo: lido.tipo, tri: lido.tri, tag: lido.tag, detalhe: lido.detalhe, dados: lido.dados }),
          });
          const corpo = (await r.json().catch(() => ({}))) as { id?: string; criadoEm?: string; erro?: string };
          if (!r.ok || !corpo.id) {
            novos.push({ nome: p.nome, ok: false, detalhe: corpo.erro ?? "Não foi possível guardar o arquivo." });
            continue;
          }
          const novo = { id: corpo.id, nome: p.nome, tag: lido.tag, detalhe: lido.detalhe, criadoEm: corpo.criadoEm ?? "", tipo: lido.tipo, tri: lido.tri, dados: lido.dados } as Arquivo;
          atual = [...atual.filter((a) => !(novo.tipo === "base" && a.tipo === "base" && a.tri === novo.tri)), novo];
          setArquivos(atual);
          novos.push({ nome: p.nome, ok: true, detalhe: `${lido.tag} · ${lido.detalhe}` });
        }
        if (!algum) novos.push({ nome: f.name, ok: false, detalhe: "Não reconhecido — confira o cabeçalho." });
      }
    } finally {
      setRetornos(novos);
      setLendo(false);
    }
  }

  async function remover(id: string) {
    const r = await fetch(`/api/ico-fiscal?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (r.ok) setArquivos((a) => a.filter((x) => x.id !== id));
  }
  async function removerTodos() {
    if (!confirm("Remover todos os arquivos importados do ICO Fiscal?")) return;
    const r = await fetch("/api/ico-fiscal?todos=1", { method: "DELETE" });
    if (r.ok) {
      setArquivos([]);
      setAno(null);
      setTri(null);
      setAno2(null);
      setTri2(null);
      setMenu(false);
    }
  }

  if (carregando) return <p className="text-sm text-ink/50 px-8 py-10">Carregando…</p>;

  const campo = "font-sans text-sm font-semibold px-3 py-2 rounded-pill border border-sand/25 bg-white/10 text-white cursor-pointer outline-none focus:border-mint [&_option]:text-ink";
  const rotulo = "text-[11px] uppercase tracking-[.12em] text-sand font-semibold";
  const seletores = (a: string, setA: (v: string) => void, t: string, setT: (v: string) => void, comRotulos: boolean) => (
    <div className="flex items-center gap-2">
      {comRotulos && <label className={rotulo}>Ano</label>}
      <select className={campo} value={a} onChange={(e) => setA(e.target.value)} aria-label="Ano"><option value="TODOS">Todos</option>{anos.map((x) => <option key={x}>{x}</option>)}</select>
      {comRotulos && <label className={rotulo}>Trimestre</label>}
      <select className={campo} value={t} onChange={(e) => setT(e.target.value)} aria-label="Trimestre"><option value="TODOS">Todos</option>{nums.map((x) => <option key={x} value={x}>{x}º trimestre</option>)}</select>
    </div>
  );

  return (
    <TipProvider>
      {todos.length > 0 && (
        <div className="sticky top-0 z-40 bg-deep text-sand px-8 py-3 flex flex-wrap items-center gap-x-5 gap-y-3 shadow-[0_10px_30px_-22px_rgba(0,50,60,.9)]">
          {seletores(ano, setAno, tri, setTri, true)}
          <label className="inline-flex items-center gap-[7px] text-[13px] cursor-pointer select-none">
            <input type="checkbox" checked={soLanc} onChange={(e) => setSoLanc(e.target.checked)} className="accent-mint w-[15px] h-[15px]" /> Só trimestres lançados
          </label>
          <div className="flex items-center gap-2 pl-3.5 border-l border-sand/20">
            <button type="button" aria-pressed={comparar} onClick={() => setComparar((c) => !c)}
              className={`text-sm font-semibold px-4 py-2 rounded-pill border transition ${comparar ? "bg-mint border-mint text-deep" : "border-sand/30 text-sand hover:bg-white/10 hover:text-white"}`}>Comparar</button>
            {comparar && <><span className={rotulo}>com</span>{seletores(ano2, setAno2, tri2, setTri2, false)}</>}
          </div>
          <button type="button" onClick={() => setMenu(true)} className="ml-auto text-sm font-semibold px-4 py-2 rounded-pill border border-sand/30 text-sand hover:bg-white/10 hover:text-white">Arquivos</button>
        </div>
      )}

      <div className="max-w-[1340px] mx-auto px-8 py-8">
        {erro && <p className="text-sm text-danger font-semibold mb-4">{erro}</p>}
        {!todos.length ? (
          <ZonaImportar lendo={lendo} arrastando={arrastando} setArrastando={setArrastando} entrada={entrada} receber={receber} retornos={retornos} />
        ) : (
          <>
            <header className="mb-5 flex flex-col gap-2.5">
              <span className="inline-flex items-center gap-3 text-[12px] font-semibold tracking-[.28em] uppercase text-mint before:content-[''] before:w-6 before:h-px before:bg-mint/70">{comparar ? "Comparação" : "Período"}</span>
              <h1 className="font-serif font-black text-[clamp(1.6rem,3.2vw,2.1rem)] text-deep leading-tight">
                {comparar ? `${rotuloPeriodo(trisA, ano, tri)} × ${rotuloPeriodo(trisB ?? [], ano2, tri2)}` : rotuloPeriodo(trisA, ano, tri)}
              </h1>
            </header>
            {!A.carteira.comBase.length && (
              <div className="flex gap-[11px] px-[17px] py-[13px] rounded-xl bg-clay/10 border border-clay/30 text-[13.5px] text-[#8a4a28] mb-4 leading-relaxed">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                Nenhuma base de dados lançada para este período. Os pontos de ICO ficam zerados; só as contagens de entrega aparecem.
              </div>
            )}
            <KpisPrincipais A={A} B={B} rotuloB={rotuloB} />
            <Complexidade emp={A.carteira.empresas} />
            <GrauCarteira emp={A.carteira.empresas} />
            <PorResponsavel db={db} emp={A.carteira.empresas} tris={trisA} />
            <TabelaEmpresas emp={A.carteira.empresas} />
            <MudancaDeGrau db={db} trisA={trisA} trisB={trisB} />
            <Producao A={A} B={B} rotuloB={rotuloB} />
            <Metodologia nTris={A.carteira.nTris} />
            <Rodape db={db} nTris={trisA.length} />
          </>
        )}
      </div>

      {menu && (
        <Modal titulo="Arquivos importados" sub="Remover um arquivo refaz todas as contas sem ele." onFechar={() => setMenu(false)} largura="max-w-xl">
          <div className="space-y-2 overflow-y-auto max-h-[50vh]">
            <ListaArquivos arquivos={arquivos} remover={remover} />
          </div>
          {retornos.length > 0 && <Retornos retornos={retornos} />}
          <div className="flex flex-wrap gap-2.5 mt-4 pt-3.5 border-t border-ink/10">
            <input ref={entrada} type="file" accept=".csv,.xlsx,.xls,text/csv" multiple hidden onChange={(e) => { if (e.target.files) receber(e.target.files); e.target.value = ""; }} />
            <Button size="sm" onClick={() => entrada.current?.click()} disabled={lendo}>
              {lendo && <Loader2 className="w-4 h-4 animate-spin" />} Adicionar arquivos
            </Button>
            <BaixarArquivo />
            <a href={MODELO} download={NOME_MODELO} className="inline-flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-pill border border-ink/15 text-ink hover:border-mint hover:text-mint-700">
              <Download className="w-4 h-4" /> Modelo em branco
            </a>
            <Button size="sm" variant="danger" onClick={removerTodos}>Remover todos</Button>
          </div>
        </Modal>
      )}
    </TipProvider>
  );
}

function ListaArquivos({ arquivos, remover }: { arquivos: Arquivo[]; remover?: (id: string) => void }) {
  if (!arquivos.length) return <p className="text-sm text-text-3">Nenhum arquivo importado ainda.</p>;
  return (
    <>
      {arquivos.map((a) => (
        <div key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-[11px] rounded-xl bg-paper border border-ink/10 text-[13.5px]">
          <span className="w-2 h-2 rounded-full bg-mint shrink-0" />
          <span className="font-semibold min-w-0 truncate">{a.nome}</span>
          <span className={`text-[12px] font-semibold px-2.5 py-[3px] rounded-pill whitespace-nowrap ${a.tipo === "base" ? "bg-deep/10 text-deep" : "bg-mint/15 text-[#0d7d6e]"}`}>{a.tag}</span>
          <span className="text-text-3 ml-auto whitespace-nowrap text-[12.5px]">{a.detalhe}</span>
          {remover && (
            <button type="button" aria-label={`Remover ${a.nome}`} onClick={() => remover(a.id)} className="w-[26px] h-[26px] rounded-full border border-ink/10 text-text-3 hover:border-danger hover:text-danger flex items-center justify-center">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
    </>
  );
}

function Retornos({ retornos }: { retornos: Retorno[] }) {
  return (
    <ul className="mt-3 space-y-1.5">
      {retornos.map((r, i) => (
        <li key={i} className={`flex gap-2 text-[13px] ${r.ok ? "text-[#0d7d6e]" : "text-danger"}`}>
          <span className="font-semibold truncate">{r.nome}</span>
          <span className="text-text-2">{r.detalhe}</span>
        </li>
      ))}
    </ul>
  );
}

function ZonaImportar({ lendo, arrastando, setArrastando, entrada, receber, retornos }: {
  lendo: boolean; arrastando: boolean; setArrastando: (v: boolean) => void; entrada: React.RefObject<HTMLInputElement | null>;
  receber: (f: FileList | File[]) => void; retornos: Retorno[];
}) {
  return (
    <div
      onDragEnter={(e) => { e.preventDefault(); setArrastando(true); }}
      onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
      onDragLeave={(e) => { e.preventDefault(); setArrastando(false); }}
      onDrop={(e) => { e.preventDefault(); setArrastando(false); if (e.dataTransfer.files.length) receber(e.dataTransfer.files); }}
      className={`border-2 border-dashed rounded-3xl bg-white px-8 py-12 text-center transition ${arrastando ? "border-mint bg-mint/5" : "border-ink/20"}`}
    >
      <div className="w-[60px] h-[60px] rounded-[18px] bg-mint/12 flex items-center justify-center mx-auto mb-4"><Upload className="w-7 h-7 text-teal" /></div>
      <h2 className="font-serif font-black text-2xl text-deep mb-2">Importe os dois relatórios</h2>
      <p className="text-text-2 max-w-[60ch] mx-auto mb-5 text-sm">
        Arraste os arquivos para cá ou clique para selecionar. Pode ser a planilha do Excel (as abas <b>Base de Dados</b> e <b>Obrigações Acessórias</b> são lidas sozinhas) ou os CSVs. Cada arquivo é identificado pelo cabeçalho e marcado com o trimestre a que pertence. O que você importa fica guardado no Hub.
      </p>
      <input ref={entrada} type="file" accept=".csv,.xlsx,.xls,text/csv" multiple hidden onChange={(e) => { if (e.target.files) receber(e.target.files); e.target.value = ""; }} />
      <Button variant="solid" onClick={() => entrada.current?.click()} disabled={lendo}>
        {lendo && <Loader2 className="w-4 h-4 animate-spin" />} {lendo ? "Lendo e guardando…" : "Selecionar arquivos"}
      </Button>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[13px]">
        <BaixarArquivo className="inline-flex items-center gap-1.5 font-semibold text-teal hover:underline" />
        <a href={MODELO} download={NOME_MODELO} className="inline-flex items-center gap-1.5 font-semibold text-text-2 hover:underline">
          <Download className="w-4 h-4" /> Modelo em branco, sem dados
        </a>
      </div>
      <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(min(100%,255px),1fr))] mt-6 text-left">
        {[
          ["Base de Dados", "Um arquivo por trimestre. Precisa das colunas ID, Pontos e Grau, e das células Data Início / Data Fim."],
          ["Obrigações Acessórias", "Pode conter vários meses. Precisa de Fimmês, EmpID, Data da entrega, Status e Responsável entrega."],
          ["Planilha de dados", "A aba Base de Dados calcula o ICO de um trimestre por vez (Data Início e Data Fim). Importe a planilha de cada trimestre; as Obrigações podem vir uma vez só, com todos os meses."],
          ["Formato", "Excel (.xlsx) ou CSV com ponto e vírgula e decimal com vírgula. Os acentos quebrados na exportação são corrigidos na leitura."],
        ].map(([t, d]) => (
          <div key={t} className="border border-ink/10 rounded-[14px] px-[17px] py-[15px] bg-paper">
            <b className="block text-sm mb-0.5">{t}</b>
            <span className="text-[13px] text-text-2 leading-normal">{d}</span>
          </div>
        ))}
      </div>
      {retornos.length > 0 && <div className="text-left max-w-xl mx-auto mt-5"><Retornos retornos={retornos} /></div>}
    </div>
  );
}
