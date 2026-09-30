"use client";

import { useCallback, useEffect, useState } from "react";
import type { RespostaEmpresas } from "@/lib/diario/tipos";

/** Lista de empresas vinda de `/api/diario/empresas` (que lê o Acessórias). */
export function useEmpresas() {
  const [dados, setDados] = useState<RespostaEmpresas | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async (forcar: boolean) => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/diario/empresas${forcar ? "?atualizar=1" : ""}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Erro ${res.status}`);
      setDados(json as RespostaEmpresas);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar as empresas.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar(false);
  }, [carregar]);

  return { dados, erro, carregando, atualizar: () => carregar(true) };
}

export function horaCurta(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
