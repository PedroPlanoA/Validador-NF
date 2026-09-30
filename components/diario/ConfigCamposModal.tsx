"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, List, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CAMPOS_PADRAO, GRUPOS, catalogoCompleto } from "@/lib/diario/campos";
import { useConfigFicha, type ConfigFicha } from "@/lib/diario/armazenamento";
import type { EmpresaAcessorias } from "@/lib/diario/tipos";
import { Modal } from "./Modal";

/**
 * Escolha dos campos do Acessórias que aparecem na ficha. É **uma configuração
 * geral**: vale para a ficha de todas as empresas.
 *
 * À esquerda, o catálogo agrupado para marcar/desmarcar; à direita, os campos
 * marcados na ordem em que vão aparecer, com setas para reordenar.
 */
export function ConfigCamposModal({
  empresas,
  onFechar,
}: {
  empresas: EmpresaAcessorias[];
  onFechar: () => void;
}) {
  const [config, salvarConfig, pronta] = useConfigFicha();
  // O formulário copia a configuração ao montar; por isso só monta depois que ela chegou do banco.
  if (!pronta) {
    return (
      <Modal titulo="Campos da ficha" largura="max-w-3xl" onFechar={onFechar}>
        <p className="text-sm text-ink/50 py-10 text-center">Carregando configuração…</p>
      </Modal>
    );
  }
  return <FormularioCampos config={config} salvarConfig={salvarConfig} empresas={empresas} onFechar={onFechar} />;
}

function FormularioCampos({
  config,
  salvarConfig,
  empresas,
  onFechar,
}: {
  config: ConfigFicha;
  salvarConfig: (c: ConfigFicha) => void;
  empresas: EmpresaAcessorias[];
  onFechar: () => void;
}) {
  const [selecionados, setSelecionados] = useState<string[]>(config.campos);
  // null = todos os departamentos.
  const [deptos, setDeptos] = useState<string[] | null>(config.departamentos ?? null);
  const catalogo = useMemo(() => catalogoCompleto(empresas), [empresas]);
  const porChave = useMemo(() => new Map(catalogo.map((c) => [c.chave, c])), [catalogo]);

  function alternar(chave: string) {
    setSelecionados((s) => (s.includes(chave) ? s.filter((k) => k !== chave) : [...s, chave]));
  }

  function mover(i: number, delta: number) {
    setSelecionados((s) => {
      const j = i + delta;
      if (j < 0 || j >= s.length) return s;
      const n = [...s];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  }

  // Departamentos conhecidos: os das empresas carregadas + os já escolhidos antes.
  const nomesDeptos = useMemo(() => {
    const n = new Set<string>(deptos ?? []);
    for (const e of empresas) for (const d of e.Departamentos ?? []) if (d.Nome?.trim()) n.add(d.Nome.trim());
    return [...n].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
  }, [empresas, deptos]);

  function alternarDepto(nome: string) {
    const atual = deptos ?? nomesDeptos;
    const novo = atual.includes(nome) ? atual.filter((d) => d !== nome) : [...atual, nome];
    setDeptos(novo.length === nomesDeptos.length ? null : novo);
  }

  function salvar() {
    salvarConfig({ campos: selecionados, departamentos: deptos });
    onFechar();
  }

  return (
    <Modal
      titulo="Campos da ficha"
      sub="Configuração geral: os campos escolhidos aqui aparecem na ficha de todas as empresas."
      largura="max-w-3xl"
      onFechar={onFechar}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 min-h-0 flex-1 overflow-hidden">
        <div className="overflow-y-auto pr-1 space-y-4 min-h-0">
          {GRUPOS.map((grupo) => {
            const campos = catalogo.filter((c) => c.grupo === grupo);
            if (campos.length === 0) return null;
            return (
              <div key={grupo}>
                <span className="block text-[10px] font-bold uppercase tracking-[.14em] text-ink/45 mb-1.5">
                  {grupo}
                </span>
                <div className="space-y-0.5">
                  {campos.map((c) => {
                    const on = selecionados.includes(c.chave);
                    return (
                      <div key={c.chave}>
                      <button
                        type="button"
                        onClick={() => alternar(c.chave)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-input text-left text-sm transition-colors ${
                          on ? "bg-mint/10 text-deep" : "text-ink/70 hover:bg-paper-alt/60"
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-[5px] border-2 flex items-center justify-center shrink-0 transition-colors ${
                            on ? "bg-mint-600 border-mint-600" : "border-ink/20 bg-white"
                          }`}
                        >
                          {on && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                        </span>
                        <span className="flex-1 font-semibold">{c.rotulo}</span>
                        {c.tipo === "lista" && <List className="w-3.5 h-3.5 text-ink/30" aria-label="Lista" />}
                      </button>
                      {c.chave === "Departamentos" && on && nomesDeptos.length > 0 && (
                        <div className="ml-7 mt-1 mb-2 pl-3 border-l-2 border-mint/40">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-[.14em] text-ink/45">
                              Departamentos exibidos · {(deptos ?? nomesDeptos).length}/{nomesDeptos.length}
                            </span>
                            <button
                              type="button"
                              onClick={() => setDeptos(deptos === null ? [] : null)}
                              className="text-[11px] font-bold text-teal hover:underline"
                            >
                              {deptos === null ? "Limpar" : "Marcar todos"}
                            </button>
                          </div>
                          {nomesDeptos.map((nome) => {
                            const marcado = (deptos ?? nomesDeptos).includes(nome);
                            return (
                              <button
                                key={nome}
                                type="button"
                                onClick={() => alternarDepto(nome)}
                                className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-left text-[13px] transition-colors ${
                                  marcado ? "text-deep" : "text-ink/50 hover:bg-paper-alt/60"
                                }`}
                              >
                                <span
                                  className={`w-3.5 h-3.5 rounded-[4px] border-2 flex items-center justify-center shrink-0 ${
                                    marcado ? "bg-mint-600 border-mint-600" : "border-ink/20 bg-white"
                                  }`}
                                >
                                  {marcado && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                                </span>
                                {nome}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col min-h-0 bg-paper-alt/40 rounded-card-sm p-3">
          <span className="block text-[10px] font-bold uppercase tracking-[.14em] text-ink/45 mb-2 px-1">
            Ordem na ficha · {selecionados.length} {selecionados.length === 1 ? "campo" : "campos"}
          </span>
          {selecionados.length === 0 ? (
            <p className="text-sm text-ink/50 italic px-1">Nenhum campo selecionado.</p>
          ) : (
            <ol className="overflow-y-auto space-y-1 min-h-0">
              {selecionados.map((k, i) => (
                <li
                  key={k}
                  className="flex items-center gap-1 bg-white border border-ink/5 rounded-input pl-3 pr-1 py-1.5 text-sm"
                >
                  <span className="text-[11px] tabular-nums text-ink/35 w-5">{i + 1}</span>
                  <span className="flex-1 font-semibold text-ink truncate">{porChave.get(k)?.rotulo ?? k}</span>
                  <button
                    type="button"
                    onClick={() => mover(i, -1)}
                    disabled={i === 0}
                    className="p-1 rounded text-ink/40 hover:text-teal disabled:opacity-25"
                    aria-label="Subir"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => mover(i, 1)}
                    disabled={i === selecionados.length - 1}
                    className="p-1 rounded text-ink/40 hover:text-teal disabled:opacity-25"
                    aria-label="Descer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => alternar(k)}
                    className="p-1 rounded text-ink/40 hover:text-danger"
                    aria-label="Remover"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-5 shrink-0">
        <button
          type="button"
          onClick={() => {
            setSelecionados(CAMPOS_PADRAO);
            setDeptos(null);
          }}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-ink/50 hover:text-teal"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Restaurar padrão
        </button>
        <div className="flex gap-3">
          <Button variant="ghost" size="sm" onClick={onFechar}>
            Cancelar
          </Button>
          <Button variant="solid" size="sm" onClick={salvar}>
            Salvar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
