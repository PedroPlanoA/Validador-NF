"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Building2, NotebookPen, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatarValor, statusAtivo } from "@/lib/diario/campos";
import { useResumoDiarios } from "@/lib/diario/armazenamento";
import { chaveEmpresa, nomeEmpresa, type EmpresaAcessorias } from "@/lib/diario/tipos";
import { AcoesDiario, AvisoFonte } from "./AcoesDiario";
import { horaCurta, useEmpresas } from "./useEmpresas";

const OPEN_ANIMATION_MS = 200;
const DOC_DIGITS = new Set([11, 14]);

/** Ordem crescente pelo código numérico da empresa; sem código vão para o fim. */
function porCodigo(a: EmpresaAcessorias, b: EmpresaAcessorias): number {
  const na = Number.parseInt(String(a.ID ?? ""), 10);
  const nb = Number.parseInt(String(b.ID ?? ""), 10);
  const va = Number.isFinite(na) ? na : Infinity;
  const vb = Number.isFinite(nb) ? nb : Infinity;
  if (va !== vb) return va < vb ? -1 : 1;
  return nomeEmpresa(a).localeCompare(nomeEmpresa(b), "pt-BR");
}

type FiltroSituacao = "ativas" | "inativas" | "todas";

/**
 * Lista de clientes — o mesmo desenho da lista de empresas do Validador
 * (`components/company/CompaniesManager.tsx`): busca, grade de cards de 4
 * colunas, pastilha de contagem à esquerda e engrenagem à direita.
 *
 * Diferenças: os dados vêm do Acessórias (não são cadastrados aqui), há filtro
 * de situação/regime, e cada card mostra se o cliente tem diário e alertas.
 */
export function ListaClientes() {
  const router = useRouter();
  const { dados, erro, carregando, atualizar } = useEmpresas();
  const resumo = useResumoDiarios();
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState<FiltroSituacao>("ativas");
  const [regime, setRegime] = useState("");
  const [abrindo, setAbrindo] = useState<string | null>(null);

  const empresas = useMemo(() => dados?.empresas ?? [], [dados]);

  const regimes = useMemo(
    () => [...new Set(empresas.map((e) => e.Regime?.trim()).filter(Boolean) as string[])].sort(),
    [empresas],
  );

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    // Documento só casa com os dígitos completos (11 ou 14), como no Validador:
    // pedaços de número casariam com meia lista.
    const qDig = q.replace(/\D/g, "");
    const doc = DOC_DIGITS.has(qDig.length) && /^[\d./-\s]+$/.test(q) ? qDig : null;
    return empresas
      .filter((e) => {
        if (situacao === "ativas" && !statusAtivo(e.Status)) return false;
        if (situacao === "inativas" && statusAtivo(e.Status)) return false;
        if (regime && e.Regime?.trim() !== regime) return false;
        if (!q) return true;
        if (doc) return chaveEmpresa(e) === doc;
        return (
          String(e.ID ?? "").toLowerCase() === q ||
          (e.Razao ?? "").toLowerCase().includes(q) ||
          (e.Fantasia ?? "").toLowerCase().includes(q)
        );
      })
      .sort(porCodigo);
  }, [empresas, busca, situacao, regime]);

  // Quantas empresas há em cada regime (respeitando só o filtro de situação),
  // para o número do chip refletir o que aparece ao clicar.
  const contagemRegime = useMemo(() => {
    const c = new Map<string, number>();
    for (const e of empresas) {
      if (situacao === "ativas" && !statusAtivo(e.Status)) continue;
      if (situacao === "inativas" && statusAtivo(e.Status)) continue;
      const r = e.Regime?.trim();
      if (r) c.set(r, (c.get(r) ?? 0) + 1);
    }
    return c;
  }, [empresas, situacao]);
  const totalSituacao = [...contagemRegime.values()].reduce((a, b) => a + b, 0);

  function abrir(e: React.MouseEvent, href: string, chave: string) {
    e.preventDefault();
    setAbrindo(chave);
    setTimeout(() => router.push(href), OPEN_ANIMATION_MS);
  }

  return (
    <>
      <AvisoFonte fonte={dados?.fonte} erro={erro} />

      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-ink/30 pointer-events-none" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar por código, nome ou CNPJ/CPF completo..."
            className="w-full pl-11 pr-4 py-3 text-sm text-ink placeholder:text-ink/40 border border-ink/10 rounded-input outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint bg-white"
          />
        </div>

        <div className="flex items-center gap-1 bg-paper-alt/70 rounded-pill p-1 shadow-[inset_0_1px_3px_rgba(0,50,60,0.10)] self-start md:self-auto">
          {(["ativas", "inativas", "todas"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSituacao(s)}
              className={`px-4 py-1.5 rounded-pill text-xs font-bold capitalize transition-all ${
                situacao === s ? "bg-white text-deep shadow-card" : "text-ink/45 hover:text-deep"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

      </div>

      {regimes.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Filtrar por regime">
          <span className="text-[10px] font-bold uppercase tracking-[.14em] text-ink/45 mr-1">Regime</span>
          {[{ nome: "", total: totalSituacao }, ...regimes.map((r) => ({ nome: r, total: contagemRegime.get(r) ?? 0 }))]
            .filter((r) => r.nome === "" || r.total > 0 || r.nome === regime)
            .map((r) => {
              const on = regime === r.nome;
              return (
                <button
                  key={r.nome || "todos"}
                  type="button"
                  onClick={() => setRegime(r.nome)}
                  aria-pressed={on}
                  className={`inline-flex items-center gap-2 pl-3.5 pr-2 py-1.5 rounded-pill text-xs font-bold border transition-all ${
                    on
                      ? "bg-deep border-deep text-white shadow-card"
                      : "bg-white border-ink/10 text-ink/60 hover:border-mint hover:text-deep"
                  }`}
                >
                  {r.nome || "Todos"}
                  <span
                    className={`min-w-5 text-center rounded-pill px-1.5 py-0.5 text-[10px] tabular-nums ${
                      on ? "bg-mint text-deep" : "bg-paper-alt text-ink/50"
                    }`}
                  >
                    {r.total}
                  </span>
                </button>
              );
            })}
        </div>
      )}

      {carregando && !dados ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-busy="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="p-5 animate-pulse">
              <div className="h-5 w-24 bg-deep/8 rounded-pill" />
              <div className="h-5 w-4/5 bg-ink/8 rounded mt-3" />
              <div className="h-3 w-1/2 bg-ink/5 rounded mt-2.5" />
            </Card>
          ))}
        </div>
      ) : visiveis.length === 0 ? (
        <p className="text-sm text-ink/50 italic">
          {empresas.length === 0 ? "Nenhuma empresa encontrada no Acessórias." : "Nenhum cliente corresponde à pesquisa."}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {visiveis.map((e) => {
            const chave = chaveEmpresa(e);
            const href = `/diario-cliente/${chave}`;
            const r = resumo[chave];
            const ativo = statusAtivo(e.Status);
            const isOpening = abrindo === chave;
            const isDimmed = abrindo !== null && !isOpening;
            return (
              <Link key={chave} href={href} onClick={(ev) => abrir(ev, href, chave)} className="block">
                <Card
                  className={`p-5 h-full flex flex-col relative transition-all duration-200 hover:shadow-card-hover ${
                    isOpening ? "scale-105 shadow-card-hover" : ""
                  } ${isDimmed ? "opacity-40" : ""} ${ativo ? "" : "bg-white/70"}`}
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {e.ID && (
                      <span className="inline-flex items-center bg-deep/8 text-deep text-[10px] font-bold uppercase tracking-[.14em] px-2.5 py-1 rounded-pill">
                        Código {e.ID}
                      </span>
                    )}
                    {!ativo && (
                      <span className="inline-flex items-center bg-ink/6 text-ink/50 text-[10px] font-bold uppercase tracking-[.14em] px-2.5 py-1 rounded-pill">
                        {e.Status || "Inativa"}
                      </span>
                    )}
                  </div>
                  <h3
                    className={`font-sans font-semibold text-xl mt-2.5 leading-snug ${
                      ativo ? "text-mint-600" : "text-ink/45"
                    }`}
                  >
                    {nomeEmpresa(e)}
                  </h3>
                  <span className="text-xs text-ink/50 block mt-1.5 tabular-nums">
                    {formatarValor(e.Identificador, "documento")}
                  </span>

                  {(e.Regime || r?.blocos || r?.alertas) && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-auto pt-3">
                      {e.Regime && (
                        <span className="text-[11px] font-semibold text-teal bg-teal/8 px-2 py-0.5 rounded-pill">
                          {e.Regime}
                        </span>
                      )}
                      {r?.alertas ? (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-clay-700 bg-clay/12 px-2 py-0.5 rounded-pill"
                          title="Alertas no diário"
                        >
                          <AlertTriangle className="w-3 h-3" /> {r.alertas}
                        </span>
                      ) : null}
                      {r?.blocos ? (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink/45 px-1 py-0.5"
                          title="Itens no diário"
                        >
                          <NotebookPen className="w-3 h-3" /> {r.blocos}
                        </span>
                      ) : null}
                    </div>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Mesma pastilha da lista de empresas do Validador, alinhada ao FAB (`h-14`). */}
      <div className="fixed bottom-6 left-6 z-30 h-14 hidden sm:flex items-center">
        <span className="flex items-center gap-2 bg-white border border-ink/10 shadow-card rounded-pill px-4 py-2.5 text-xs font-semibold text-ink/60">
          <Building2 className="w-3.5 h-3.5 text-primary" />
          {visiveis.length === empresas.length
            ? `${empresas.length} ${empresas.length === 1 ? "cliente" : "clientes"}`
            : `${visiveis.length} ${visiveis.length === 1 ? "cliente" : "clientes"}`}
          {dados && (
            <span className="text-ink/35 font-normal">
              · {carregando ? "atualizando…" : `Acessórias ${horaCurta(dados.atualizadoEm)}`}
            </span>
          )}
        </span>
      </div>

      <AcoesDiario empresas={empresas} onAtualizar={atualizar} atualizando={carregando} />
    </>
  );
}
