"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CAMPOS_PADRAO } from "./campos";
import {
  obterConfigDiario,
  obterDiario,
  resumoDiarios,
  salvarConfigDiario,
  salvarDiario,
  type DiarioRemoto,
} from "@/lib/actions/diario";

/**
 * Persistência do Diário do Cliente: a configuração geral e o diário de cada
 * empresa moram no banco do Hub (`DiarioConfig` e `DiarioCliente`), via Server
 * Actions em `lib/actions/diario.ts`. Os hooks abaixo são a única porta que os
 * componentes usam.
 *
 * Como o editor grava a cada tecla, o estado local é otimista e a gravação no
 * servidor é adiada (`DEBOUNCE_MS`); ao sair da tela o que está pendente é
 * enviado na hora.
 */

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface ConfigFicha {
  /** Campos visíveis na ficha, na ordem em que aparecem. */
  campos: string[];
  /** Departamentos exibidos na lista de responsáveis. `null`/ausente = todos. */
  departamentos?: string[] | null;
}

export const TIPOS_BLOCO = ["secao", "topico", "subtopico", "anotacao", "dica", "importante", "alerta"] as const;
export type TipoBloco = (typeof TIPOS_BLOCO)[number];

export interface Bloco {
  id: string;
  tipo: TipoBloco;
  texto: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Diario {
  blocos: Bloco[];
  atualizadoEm: string | null;
}

const CONFIG_PADRAO: ConfigFicha = { campos: CAMPOS_PADRAO, departamentos: null };
const DIARIO_VAZIO: Diario = { blocos: [], atualizadoEm: null };

const DEBOUNCE_MS = 700;

// ─── Estado compartilhado entre componentes ─────────────────────────────────
// A ficha e o modal de configuração usam o mesmo hook ao mesmo tempo; o cache
// em módulo mantém os dois em sincronia sem precisar de contexto.

const cache = new Map<string, unknown>();
const ouvintes = new Map<string, Set<(v: unknown) => void>>();
const pendentes = new Map<string, { timer: ReturnType<typeof setTimeout>; enviar: () => Promise<void> }>();
/** Gravações em andamento por chave: a próxima espera a anterior terminar, senão
 *  uma gravação usaria a versão velha e brigaria com a anterior da mesma pessoa. */
const emVoo = new Map<string, Promise<void>>();
/** Versão (do servidor) em que cada diário foi carregado — base do controle de conflito. */
const versoes = new Map<string, string | null>();

function publicar(chave: string, valor: unknown) {
  cache.set(chave, valor);
  ouvintes.get(chave)?.forEach((f) => f(valor));
}

async function enviarPendente(chave: string) {
  const p = pendentes.get(chave);
  if (!p) return;
  clearTimeout(p.timer);
  pendentes.delete(chave);
  const fila = (emVoo.get(chave) ?? Promise.resolve()).then(p.enviar);
  emVoo.set(chave, fila);
  await fila;
}

/** Resposta de uma gravação: `conflito` traz a versão que está no servidor. */
type ResultadoGravacao<T> = void | { conflito: T };

function useRemoto<T>(
  chave: string,
  padrao: T,
  carregar: () => Promise<T>,
  gravar: (valor: T) => Promise<ResultadoGravacao<T>>,
  espera: number,
  /** Chamado quando uma versão do servidor passa a valer (carga inicial, ou conflito resolvido). */
  adotar?: (servidor: T) => void,
) {
  const [valor, setValor] = useState<T>(() => (cache.has(chave) ? (cache.get(chave) as T) : padrao));
  const [carregado, setCarregado] = useState(() => cache.has(chave));
  const [erro, setErro] = useState<string | null>(null);
  const [conflito, setConflito] = useState<T | null>(null);
  const conflitoRef = useRef<T | null>(null);
  // As funções vêm de fora a cada render; o ref evita reassinar ouvintes por isso.
  const fns = useRef({ carregar, gravar, adotar });
  useEffect(() => {
    fns.current = { carregar, gravar, adotar };
  });

  useEffect(() => {
    let vivo = true;
    const aoMudar = (v: unknown) => setValor(v as T);
    if (!ouvintes.has(chave)) ouvintes.set(chave, new Set());
    ouvintes.get(chave)!.add(aoMudar);

    // Sempre busca de novo ao abrir: outra pessoa pode ter editado. Se há
    // gravação pendente desta aba, o que está na tela é mais novo que o servidor
    // — e a versão-base não muda, para o conflito (se houver) aparecer ao gravar.
    fns.current
      .carregar()
      .then((v) => {
        if (!vivo) return;
        if (!pendentes.has(chave)) {
          fns.current.adotar?.(v);
          publicar(chave, v);
        }
        setCarregado(true);
      })
      .catch(() => {
        if (vivo) setErro("Não foi possível carregar os dados salvos.");
      });

    const aoSair = () => void enviarPendente(chave);
    window.addEventListener("pagehide", aoSair);
    return () => {
      vivo = false;
      ouvintes.get(chave)?.delete(aoMudar);
      window.removeEventListener("pagehide", aoSair);
      void enviarPendente(chave);
    };
  }, [chave]);

  const salvar = useCallback(
    (novo: T) => {
      publicar(chave, novo);
      // Com um conflito em aberto nada é enviado: a pessoa precisa escolher antes.
      if (conflitoRef.current) return;
      setErro(null);
      const enviar = async () => {
        if (conflitoRef.current) return;
        try {
          // Lê o cache na hora de enviar: é sempre o texto mais recente.
          const r = await fns.current.gravar(cache.get(chave) as T);
          if (r && "conflito" in r) {
            conflitoRef.current = r.conflito;
            setConflito(r.conflito);
          }
        } catch {
          setErro("Não foi possível salvar. Confira a conexão e tente de novo.");
        }
      };
      const anterior = pendentes.get(chave);
      if (anterior) clearTimeout(anterior.timer);
      pendentes.set(chave, { timer: setTimeout(() => void enviarPendente(chave), Math.max(espera, 0)), enviar });
      if (espera <= 0) void enviarPendente(chave);
    },
    [chave, espera],
  );

  /** `servidor`: descarta o que a pessoa escreveu e usa o que o servidor já tem.
   *  `minha`: mantém o que a pessoa escreveu, sobrescrevendo a versão do servidor. */
  const resolverConflito = useCallback(
    (escolha: "servidor" | "minha") => {
      const atual = conflitoRef.current;
      if (!atual) return;
      conflitoRef.current = null;
      setConflito(null);
      fns.current.adotar?.(atual);
      if (escolha === "servidor") publicar(chave, atual);
      else salvar(cache.get(chave) as T);
    },
    [chave, salvar],
  );

  return [valor, salvar, carregado, erro, conflito !== null, resolverConflito] as const;
}

// ─── Hooks públicos ─────────────────────────────────────────────────────────

export function useConfigFicha() {
  return useRemoto<ConfigFicha>("config", CONFIG_PADRAO, obterConfigDiario, salvarConfigDiario, 0);
}

export function useDiario(empresa: string) {
  const chave = `diario:${empresa}`;
  // No que vem do servidor, `atualizadoEm` é a própria versão da linha; no que
  // a pessoa edita, é a hora da edição — por isso a versão-base fica à parte.
  const semVersao = (d: DiarioRemoto): Diario => ({ blocos: d.blocos, atualizadoEm: d.atualizadoEm });
  return useRemoto<Diario>(
    chave,
    DIARIO_VAZIO,
    async () => semVersao(await obterDiario(empresa)),
    async (d) => {
      const r = await salvarDiario(empresa, d.blocos, versoes.get(chave) ?? null);
      if ("conflito" in r) return { conflito: semVersao(r.atual) };
      versoes.set(chave, r.versao);
    },
    DEBOUNCE_MS,
    (servidor) => versoes.set(chave, servidor.atualizadoEm),
  );
}

/** Resumo de todos os diários, para os selos dos cards da lista. */
export function useResumoDiarios() {
  const [resumo, setResumo] = useState<Record<string, { alertas: number; blocos: number }>>({});

  useEffect(() => {
    let vivo = true;
    resumoDiarios()
      .then((r) => vivo && setResumo(r))
      .catch(() => {
        // sem resumo: os cards ficam sem selo
      });
    return () => {
      vivo = false;
    };
  }, []);

  return resumo;
}

export function novoId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
