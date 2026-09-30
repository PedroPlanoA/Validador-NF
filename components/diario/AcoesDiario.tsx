"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutGrid, RefreshCw, Settings, SlidersHorizontal } from "lucide-react";
import { FAB_BUTTON_CLASS, FAB_ICON_CLASS, FAB_ITEM_CLASS, FAB_MENU_CLASS } from "@/components/ui/Fab";
import type { EmpresaAcessorias } from "@/lib/diario/tipos";
import { ConfigCamposModal } from "./ConfigCamposModal";

/**
 * Botão flutuante de ações (engrenagem), igual ao da lista de empresas do
 * Validador. Aparece na lista e na ficha.
 */
export function AcoesDiario({
  empresas,
  onAtualizar,
  atualizando,
}: {
  empresas: EmpresaAcessorias[];
  onAtualizar: () => void;
  atualizando: boolean;
}) {
  const [configAberta, setConfigAberta] = useState(false);
  return (
    <>
      <div className="group fixed bottom-6 right-6 z-40">
        <div className={FAB_MENU_CLASS}>
          <div className="bg-white border border-ink/10 shadow-card-hover rounded-card-sm py-2 w-64">
            <button onClick={() => setConfigAberta(true)} className={FAB_ITEM_CLASS}>
              <SlidersHorizontal className="w-4 h-4 text-teal" /> Campos da ficha
            </button>
            <button onClick={onAtualizar} disabled={atualizando} className={`${FAB_ITEM_CLASS} disabled:opacity-50`}>
              <RefreshCw className={`w-4 h-4 text-mint-600 ${atualizando ? "animate-spin" : ""}`} />
              {atualizando ? "Atualizando…" : "Atualizar do Acessórias"}
            </button>
            <div className="my-1.5 border-t border-ink/8" />
            <Link href="/" className={FAB_ITEM_CLASS}>
              <LayoutGrid className="w-4 h-4 text-ink/40" /> Ferramentas
            </Link>
          </div>
        </div>
        <button className={FAB_BUTTON_CLASS} aria-label="Ações" title="Ações">
          <Settings className={FAB_ICON_CLASS} />
        </button>
      </div>

      {configAberta && <ConfigCamposModal empresas={empresas} onFechar={() => setConfigAberta(false)} />}
    </>
  );
}

/** Aviso de modo demonstração ou de erro do Acessórias, no topo das telas. */
export function AvisoFonte({ fonte, erro }: { fonte?: "acessorias" | "demo"; erro?: string | null }) {
  if (erro) {
    return (
      <div className="bg-danger/8 border border-danger/20 text-danger rounded-card-sm px-5 py-3.5 text-sm">
        <strong className="font-bold">Não foi possível carregar do Acessórias.</strong> {erro}
      </div>
    );
  }
  if (fonte !== "demo") return null;
  return (
    <div className="bg-clay/10 border border-clay/25 rounded-card-sm px-5 py-3.5 text-sm text-clay-800">
      <strong className="font-bold">Modo demonstração.</strong> As empresas abaixo são fictícias. Para ler os
      clientes reais, cole o API Token do Acessórias em <code className="font-mono text-[13px]">ACESSORIAS_TOKEN</code>{" "}
      no arquivo <code className="font-mono text-[13px]">.env.local</code> e reinicie o servidor.
    </div>
  );
}
