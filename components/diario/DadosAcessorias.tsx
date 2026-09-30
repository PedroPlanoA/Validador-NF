"use client";

import { Mail, SlidersHorizontal } from "lucide-react";
import { PanelCard } from "@/components/ui/Card";
import { catalogoCompleto, formatarValor, statusAtivo, type Campo, type ColunaLista } from "@/lib/diario/campos";
import type { EmpresaAcessorias } from "@/lib/diario/tipos";

/**
 * Os campos do Acessórias escolhidos na configuração geral, na ordem
 * configurada. Campos simples viram uma grade de rótulo/valor; listas
 * (departamentos, contatos, obrigações…) viram tabelas compactas abaixo.
 */
export function DadosAcessorias({
  empresa,
  campos,
  departamentos,
  onConfigurar,
}: {
  empresa: EmpresaAcessorias;
  campos: string[];
  /** Departamentos a exibir; `null` = todos. */
  departamentos?: string[] | null;
  onConfigurar: () => void;
}) {
  const catalogo = new Map(catalogoCompleto([empresa]).map((c) => [c.chave, c]));
  const escolhidos = campos.map((k) => catalogo.get(k)).filter(Boolean) as Campo[];
  const simples = escolhidos.filter((c) => c.tipo !== "lista");
  const listas = escolhidos.filter((c) => c.tipo === "lista");

  return (
    <PanelCard
      editorial
      title="Dados do Acessórias"
      action={
        <button
          type="button"
          onClick={onConfigurar}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-ink/45 hover:text-teal transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" /> Campos da ficha
        </button>
      }
    >
      {escolhidos.length === 0 ? (
        <p className="px-6 py-5 text-sm text-ink/50 italic">
          Nenhum campo selecionado. Use “Campos da ficha” para escolher o que aparece aqui.
        </p>
      ) : (
        <div className="divide-y divide-ink/6">
          {simples.length > 0 && (
            <dl className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 px-6 py-5">
              {simples.map((c) => (
                <div key={c.chave} className="min-w-0 bg-paper/70 rounded-input px-4 py-3 border-l-[3px] border-mint/60">
                  <dt className="text-[10px] font-bold uppercase tracking-[.14em] text-teal">{c.rotulo}</dt>
                  <dd className="text-[15px] font-semibold text-deep mt-1 break-words">
                    <Valor valor={empresa[c.chave]} tipo={c.tipo} />
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {listas.length > 0 && (
            <div className="grid grid-cols-1 gap-y-7 px-6 py-5">
              {listas.map((c) => {
                let linhas = Array.isArray(empresa[c.chave]) ? (empresa[c.chave] as Record<string, unknown>[]) : [];
                const ehDeptos = c.chave === "Departamentos";
                if (ehDeptos && departamentos) {
                  linhas = linhas.filter((l) => departamentos.includes(String(l.Nome ?? "").trim()));
                }
                // Obrigação inativa não diz nada sobre o cliente: numa empresa
                // real são 27 das 37 linhas, e elas enterram as 10 que importam.
                if (c.chave === "Obrigacoes") {
                  linhas = linhas.filter((l) => String(l.Status ?? "").trim().toLowerCase() === "ativa");
                }
                return (
                  <div key={c.chave} className="min-w-0">
                    <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-teal mb-3">
                      <span className="w-4 h-px bg-mint" />
                      {c.rotulo}
                      <span className="bg-deep/8 text-deep rounded-pill px-2 py-0.5 tracking-normal">{linhas.length}</span>
                    </span>
                    {ehDeptos ? <CartoesDepartamentos linhas={linhas} /> : <Tabela linhas={linhas} colunas={c.colunas ?? []} />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </PanelCard>
  );
}

function Valor({ valor, tipo }: { valor: unknown; tipo: Campo["tipo"] | ColunaLista["tipo"] }) {
  const s = formatarValor(valor, tipo);
  if (!s) return <span className="text-ink/30">—</span>;
  if (tipo === "status") {
    const ok = statusAtivo(s);
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-pill ${
          ok ? "bg-mint/12 text-mint-700" : "bg-ink/6 text-ink/50"
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-mint" : "bg-ink/30"}`} />
        {s}
      </span>
    );
  }
  if (tipo === "documento" || tipo === "telefone") return <span className="tabular-nums">{s}</span>;
  return <>{s}</>;
}

function Tabela({ linhas, colunas }: { linhas: Record<string, unknown>[]; colunas: ColunaLista[] }) {
  if (linhas.length === 0) return <p className="text-sm text-ink/40 italic">Nenhum registro.</p>;
  const cols: ColunaLista[] =
    colunas.length > 0 ? colunas : Object.keys(linhas[0] ?? {}).map((k) => ({ chave: k, rotulo: k }));
  return (
    <div className="overflow-x-auto rounded-input border border-ink/8">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-paper-alt/50 text-left">
            {cols.map((c) => (
              <th
                key={c.chave}
                className={`px-3 py-2 text-[11px] font-bold text-ink/55 whitespace-nowrap ${
                  c.numerico ? "text-right" : ""
                }`}
              >
                {c.rotulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink/6">
          {linhas.map((l, i) => (
            <tr key={i}>
              {cols.map((c) => {
                const numerico = c.numerico;
                const v = l[c.chave];
                // Atrasadas > 0 é a única célula que pede atenção na tabela.
                const destaque = c.chave === "Atrasadas" && Number(v) > 0;
                return (
                  <td
                    key={c.chave}
                    className={`px-3 py-2 ${numerico ? "text-right tabular-nums" : ""} ${
                      destaque ? "text-clay-700 font-bold" : "text-ink/80"
                    }`}
                  >
                    <Valor valor={v} tipo={c.tipo} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function iniciais(nome: string): string {
  const p = nome.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

/** Nome do departamento sem o número de ordem ("02 - DPTO FISCAL" → "Dpto Fiscal"). */
function tituloDepartamento(nome: string): string {
  const limpo = nome.replace(/^\s*\d+\s*-\s*/, "").trim();
  return limpo.toLowerCase().replace(/(^|\s|-)(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());
}

function CartoesDepartamentos({ linhas }: { linhas: Record<string, unknown>[] }) {
  if (linhas.length === 0) return <p className="text-sm text-ink/40 italic">Nenhum departamento selecionado.</p>;
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {linhas.map((l, i) => {
        const dep = String(l.Nome ?? "");
        const resp = String(l.RespNome ?? "").trim();
        const email = String(l.RespEmail ?? "").trim();
        return (
          <li key={i} className="flex items-center gap-3 bg-white border border-ink/8 rounded-input px-3.5 py-3 hover:border-mint/60 transition-colors">
            <span className="w-10 h-10 rounded-full bg-deep text-mint-300 font-serif font-black text-sm flex items-center justify-center shrink-0">
              {iniciais(resp || dep)}
            </span>
            <div className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-[.12em] text-teal truncate">
                {tituloDepartamento(dep)}
              </span>
              <span className="block text-sm font-bold text-deep truncate">{resp || "Sem responsável"}</span>
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="flex items-center gap-1 text-xs text-ink/55 hover:text-mint-700 truncate"
                  title={email}
                >
                  <Mail className="w-3 h-3 shrink-0" />
                  <span className="truncate">{email}</span>
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
