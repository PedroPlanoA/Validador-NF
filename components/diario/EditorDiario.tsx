"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { PanelCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TIPOS_BLOCO, novoId, useDiario, type Bloco, type TipoBloco } from "@/lib/diario/armazenamento";
import { BlocoLeitura, TIPOS, niveis } from "./blocos";
import { horaCurta } from "./useEmpresas";

const RECUO_REM = 1.25;
const DESFAZER_MS = 6000;

/**
 * Diário do cliente: uma lista ordenada de itens (seção, tópico,
 * subtópico, anotação, dica, importante, alerta).
 *
 * Dois modos: **leitura** (padrão — limpo; as seções ficam sempre abertas) e
 * **edição** (cada item ganha seletor de tipo, setas e lixeira, e aparecem os
 * botões de inserir entre itens). Tudo é salvo a cada alteração.
 */
export function EditorDiario({ chave }: { chave: string }) {
  const [diario, salvarDiario, carregado, erroSalvar, emConflito, resolverConflito] = useDiario(chave);
  const [editando, setEditando] = useState(false);
  const [foco, setFoco] = useState<string | null>(null);
  const [inserirEm, setInserirEm] = useState<number | null>(null);
  const [desfazer, setDesfazer] = useState<{ bloco: Bloco; indice: number } | null>(null);

  const blocos = diario.blocos;
  const recuos = useMemo(() => niveis(blocos), [blocos]);

  useEffect(() => {
    if (!desfazer) return;
    const t = setTimeout(() => setDesfazer(null), DESFAZER_MS);
    return () => clearTimeout(t);
  }, [desfazer]);

  function gravar(novos: Bloco[]) {
    salvarDiario({ blocos: novos, atualizadoEm: new Date().toISOString() });
  }

  function adicionar(tipo: TipoBloco, indice = blocos.length) {
    const agora = new Date().toISOString();
    const b: Bloco = { id: novoId(), tipo, texto: "", criadoEm: agora, atualizadoEm: agora };
    gravar([...blocos.slice(0, indice), b, ...blocos.slice(indice)]);
    setFoco(b.id);
    setInserirEm(null);
    setEditando(true);
  }

  function alterar(id: string, patch: Partial<Pick<Bloco, "texto" | "tipo">>) {
    gravar(blocos.map((b) => (b.id === id ? { ...b, ...patch, atualizadoEm: new Date().toISOString() } : b)));
  }

  function mover(indice: number, delta: number) {
    const j = indice + delta;
    if (j < 0 || j >= blocos.length) return;
    const n = [...blocos];
    [n[indice], n[j]] = [n[j], n[indice]];
    gravar(n);
  }

  function remover(indice: number) {
    const bloco = blocos[indice];
    gravar(blocos.filter((_, i) => i !== indice));
    // Item vazio sai sem oferecer desfazer — não há o que recuperar.
    if (bloco.texto.trim()) setDesfazer({ bloco, indice });
  }

  function restaurar() {
    if (!desfazer) return;
    const { bloco, indice } = desfazer;
    gravar([...blocos.slice(0, indice), bloco, ...blocos.slice(indice)]);
    setDesfazer(null);
  }

  function concluir() {
    // Itens deixados em branco não têm valor na leitura: saem ao concluir.
    const cheios = blocos.filter((b) => b.texto.trim());
    if (cheios.length !== blocos.length) gravar(cheios);
    setEditando(false);
    setInserirEm(null);
  }

  const acoes = (
    <div className="flex items-center gap-3">
      {diario.atualizadoEm && (
        <span className="hidden sm:inline text-[11px] text-ink/40">Salvo {horaCurta(diario.atualizadoEm)}</span>
      )}
      {blocos.length > 0 &&
        (editando ? (
          <Button size="sm" variant="solid" onClick={concluir}>
            <Check className="w-3.5 h-3.5" /> Concluir
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setEditando(true)}>
            <Pencil className="w-3.5 h-3.5" /> Editar
          </Button>
        ))}
    </div>
  );

  return (
    <PanelCard editorial title="Diário do cliente" action={acoes}>
      <div className="px-6 py-5">
        {emConflito && (
          <div role="alert" className="mb-4 rounded-card-sm bg-clay/10 border border-clay/30 px-5 py-4">
            <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-clay-700">
              <AlertTriangle className="w-3.5 h-3.5" /> Diário alterado por outra pessoa
            </span>
            <p className="text-sm text-ink mt-1.5">
              Alguém salvou este diário enquanto você editava, e suas alterações ainda não foram gravadas. Escolha
              qual versão vale:
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button size="sm" variant="solid" onClick={() => resolverConflito("servidor")}>
                Usar a versão mais recente
              </Button>
              <Button size="sm" variant="ghost" onClick={() => resolverConflito("minha")}>
                Manter as minhas e sobrescrever
              </Button>
            </div>
          </div>
        )}
        {erroSalvar && (
          <p role="alert" className="mb-4 rounded-input bg-danger/8 border border-danger/20 px-4 py-2.5 text-sm text-danger">
            {erroSalvar}
          </p>
        )}
        {!carregado ? null : blocos.length === 0 ? (
          <div className="text-center py-8">
            <p className="font-serif font-bold text-lg text-deep">O diário deste cliente está vazio.</p>
            <p className="text-sm text-ink/55 mt-1 mb-5">
              Comece por uma seção (ex.: Fiscal, Contábil, Pessoal) ou registre direto um alerta ou uma dica.
            </p>
            <SeletorTipos onEscolher={(t) => adicionar(t)} centralizado />
          </div>
        ) : (
          <div className={editando ? "space-y-1" : "space-y-3"}>
            {blocos.map((b, i) => {
              const recuo = `${recuos[i] * RECUO_REM}rem`;
              return (
                <div key={b.id}>
                  {editando ? (
                    <>
                      <Inseridor
                        aberto={inserirEm === i}
                        onAbrir={() => setInserirEm(inserirEm === i ? null : i)}
                        onEscolher={(t) => adicionar(t, i)}
                      />
                      <LinhaEdicao
                        bloco={b}
                        recuo={recuo}
                        primeiro={i === 0}
                        ultimo={i === blocos.length - 1}
                        focar={foco === b.id}
                        onTexto={(texto) => alterar(b.id, { texto })}
                        onTipo={(tipo) => alterar(b.id, { tipo })}
                        onMover={(d) => mover(i, d)}
                        onRemover={() => remover(i)}
                        onEnterTitulo={() => adicionar("anotacao", i + 1)}
                      />
                    </>
                  ) : b.tipo === "secao" ? (
                    <div className={`flex items-center gap-3 border-b-2 border-deep/10 pb-2 ${i > 0 ? "mt-8" : ""}`}>
                      <span className="w-1.5 h-7 rounded-full bg-mint shrink-0" />
                      <h3 className="font-serif font-black text-xl text-deep">
                        {b.texto.trim() || "Seção sem título"}
                        <span className="text-mint">.</span>
                      </h3>
                    </div>
                  ) : (
                    <div style={{ paddingLeft: recuo }}>
                      <BlocoLeitura bloco={b} />
                    </div>
                  )}
                </div>
              );
            })}

            {editando && (
              <div className="pt-4 mt-2 border-t border-dashed border-ink/10">
                <SeletorTipos onEscolher={(t) => adicionar(t)} />
              </div>
            )}
          </div>
        )}
      </div>

      {desfazer && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-deep text-white shadow-card-hover rounded-pill pl-5 pr-2 py-2 text-xs font-semibold">
          {TIPOS[desfazer.bloco.tipo].rotulo} excluído(a).
          <button onClick={restaurar} className="bg-white/12 hover:bg-white/20 px-3 py-1.5 rounded-pill font-bold text-mint-300">
            Desfazer
          </button>
        </div>
      )}
    </PanelCard>
  );
}

/** Fileira de botões "+ Seção + Tópico …". */
function SeletorTipos({ onEscolher, centralizado }: { onEscolher: (t: TipoBloco) => void; centralizado?: boolean }) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${centralizado ? "justify-center" : ""}`}>
      {TIPOS_BLOCO.map((t) => {
        const { rotulo, icone: Icone, texto } = TIPOS[t];
        return (
          <button
            key={t}
            type="button"
            onClick={() => onEscolher(t)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-ink/60 bg-white border border-ink/10 hover:border-mint hover:text-deep px-3 py-1.5 rounded-pill transition-colors"
          >
            <Plus className="w-3 h-3 text-ink/30" />
            <Icone className={`w-3.5 h-3.5 ${texto ?? "text-ink/40"}`} />
            {rotulo}
          </button>
        );
      })}
    </div>
  );
}

/** Linha fina entre itens que, no hover, oferece inserir um item naquele ponto. */
function Inseridor({
  aberto,
  onAbrir,
  onEscolher,
}: {
  aberto: boolean;
  onAbrir: () => void;
  onEscolher: (t: TipoBloco) => void;
}) {
  return (
    <div className="group/ins relative">
      <div className={`flex items-center h-3 ${aberto ? "" : "opacity-0 group-hover/ins:opacity-100"} transition-opacity`}>
        <div className="flex-1 h-px bg-mint/40" />
        <button
          type="button"
          onClick={onAbrir}
          className="mx-2 w-5 h-5 rounded-full bg-white border border-mint text-mint-700 flex items-center justify-center hover:bg-mint hover:text-white"
          aria-label="Inserir item aqui"
          title="Inserir item aqui"
        >
          <Plus className="w-3 h-3" />
        </button>
        <div className="flex-1 h-px bg-mint/40" />
      </div>
      {aberto && (
        <div className="py-2">
          <SeletorTipos onEscolher={onEscolher} centralizado />
        </div>
      )}
    </div>
  );
}

function LinhaEdicao({
  bloco,
  recuo,
  primeiro,
  ultimo,
  focar,
  onTexto,
  onTipo,
  onMover,
  onRemover,
  onEnterTitulo,
}: {
  bloco: Bloco;
  recuo: string;
  primeiro: boolean;
  ultimo: boolean;
  focar: boolean;
  onTexto: (t: string) => void;
  onTipo: (t: TipoBloco) => void;
  onMover: (delta: number) => void;
  onRemover: () => void;
  onEnterTitulo: () => void;
}) {
  const t = TIPOS[bloco.tipo];
  const Icone = t.icone;

  const estiloTexto =
    bloco.tipo === "secao"
      ? "font-serif font-black text-xl text-deep"
      : bloco.tipo === "topico"
        ? "font-bold text-base text-ink"
        : bloco.tipo === "subtopico"
          ? "font-bold text-sm text-teal"
          : "text-sm text-ink leading-relaxed";

  return (
    <div className="group/linha flex items-start gap-2" style={{ paddingLeft: bloco.tipo === "secao" ? 0 : recuo }}>
      <div
        className={`flex-1 min-w-0 flex items-start gap-2.5 rounded-input border px-3 py-2 transition-colors focus-within:border-mint focus-within:ring-2 focus-within:ring-mint/30 ${
          t.destaque ? `${t.destaque} border-l-4 border-y-transparent border-r-transparent` : "border-ink/8 bg-white"
        }`}
      >
        <label className="relative shrink-0 mt-1" title="Mudar o tipo do item">
          <Icone className={`w-4 h-4 ${t.texto ?? "text-ink/35"}`} />
          <select
            value={bloco.tipo}
            onChange={(e) => onTipo(e.target.value as TipoBloco)}
            className="absolute inset-0 opacity-0 cursor-pointer"
            aria-label="Tipo do item"
          >
            {TIPOS_BLOCO.map((k) => (
              <option key={k} value={k}>
                {TIPOS[k].rotulo}
              </option>
            ))}
          </select>
        </label>
        <textarea
          value={bloco.texto}
          autoFocus={focar}
          rows={1}
          placeholder={t.placeholder}
          onChange={(e) => onTexto(t.titulo ? e.target.value.replace(/\n/g, " ") : e.target.value)}
          onKeyDown={(e) => {
            // Enter num título cria logo abaixo uma anotação — o fluxo natural de escrita.
            if (t.titulo && e.key === "Enter") {
              e.preventDefault();
              onEnterTitulo();
            }
          }}
          className={`flex-1 min-w-0 resize-none bg-transparent outline-none field-sizing-content placeholder:text-ink/30 placeholder:font-normal ${estiloTexto}`}
        />
        <span className="hidden md:inline text-[10px] font-bold uppercase tracking-[.12em] text-ink/30 mt-1.5 shrink-0">
          {t.rotulo}
        </span>
      </div>
      <div className="flex items-center gap-0.5 pt-1.5 opacity-40 group-hover/linha:opacity-100 group-focus-within/linha:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => onMover(-1)}
          disabled={primeiro}
          className="p-1 rounded text-ink/50 hover:text-teal disabled:opacity-25"
          aria-label="Subir"
          title="Subir"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onMover(1)}
          disabled={ultimo}
          className="p-1 rounded text-ink/50 hover:text-teal disabled:opacity-25"
          aria-label="Descer"
          title="Descer"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onRemover}
          className="p-1 rounded text-ink/50 hover:text-danger"
          aria-label="Excluir"
          title="Excluir"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
