"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ClipboardCheck, RefreshCw } from "lucide-react";
import { formatarValor, statusAtivo } from "@/lib/diario/campos";
import { useConfigFicha, useDiario } from "@/lib/diario/armazenamento";
import { nomeEmpresa, type RespostaEmpresa } from "@/lib/diario/tipos";
import { AcoesDiario, AvisoFonte } from "./AcoesDiario";
import { ConfigCamposModal } from "./ConfigCamposModal";
import { DadosAcessorias } from "./DadosAcessorias";
import { EditorDiario } from "./EditorDiario";
import { horaCurta } from "./useEmpresas";

/**
 * Ficha do cliente: cabeçalho de identificação, alertas do diário em
 * destaque, dados do Acessórias (campos da configuração geral) e o diário.
 *
 * Os dados do Acessórias são buscados frescos a cada abertura da ficha — é uma
 * única requisição e garante que a ficha reflete o cadastro atual.
 */
export function FichaCliente({ chave }: { chave: string }) {
  const [resp, setResp] = useState<RespostaEmpresa | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [configAberta, setConfigAberta] = useState(false);
  const [config, , configPronta] = useConfigFicha();
  const [diario] = useDiario(chave);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/diario/empresas/${chave}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Erro ${res.status}`);
      setResp(json as RespostaEmpresa);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar a empresa.");
    } finally {
      setCarregando(false);
    }
  }, [chave]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
  }, [carregar]);

  const alertas = diario.blocos.filter((b) => b.tipo === "alerta" && b.texto.trim());

  if (!resp) {
    return (
      <div className="space-y-6">
        <AvisoFonte erro={erro} />
        {carregando ? (
          <div className="animate-pulse space-y-3" aria-busy="true">
            <div className="h-5 w-28 bg-deep/8 rounded-pill" />
            <div className="h-9 w-2/3 bg-ink/8 rounded" />
            <div className="h-4 w-1/3 bg-ink/5 rounded" />
          </div>
        ) : (
          <p className="text-sm text-ink/60">
            Não foi possível abrir este cliente.{" "}
            <Link href="/diario-cliente" className="font-bold text-teal hover:underline">
              Voltar à lista
            </Link>
          </p>
        )}
      </div>
    );
  }

  const e = resp.empresa;
  const ativo = statusAtivo(e.Status);
  const fantasia = e.Fantasia?.trim() && e.Fantasia.trim() !== e.Razao?.trim() ? e.Fantasia.trim() : null;

  return (
    <div className="space-y-6">
      <AvisoFonte fonte={resp.fonte} erro={erro} />

      <header className="relative overflow-hidden bg-deep rounded-card px-7 py-8 md:px-10 md:py-9 shadow-card">
        <span aria-hidden className="absolute -right-16 -top-20 w-64 h-64 rounded-full bg-mint/15" />
        <span aria-hidden className="absolute right-24 -bottom-24 w-48 h-48 rounded-full bg-teal/30" />
        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div className="min-w-0">
            <span className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[.28em] text-mint-300">
              <span className="w-6 h-px bg-mint" />
              {e.ID ? `Cliente · Código ${e.ID}` : "Cliente"}
            </span>
            <h2 className="font-serif font-black text-white text-3xl md:text-4xl mt-3 leading-tight tracking-tight">
              {nomeEmpresa(e)}
              <span className="text-mint">.</span>
            </h2>
            <p className="text-sm text-sand mt-2 tabular-nums">
              {fantasia && <span className="text-white font-semibold">{fantasia} · </span>}
              {formatarValor(e.Identificador, "documento")}
            </p>
            <div className="flex items-center gap-2 flex-wrap mt-5">
              <span
                className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.14em] px-3 py-1.5 rounded-pill ${
                  ativo ? "bg-mint text-deep" : "bg-white/12 text-sand"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${ativo ? "bg-deep" : "bg-sand/60"}`} />
                {e.Status || "—"}
              </span>
              {e.Regime && (
                <span className="inline-flex items-center bg-white/10 text-white text-[10px] font-bold uppercase tracking-[.14em] px-3 py-1.5 rounded-pill">
                  {e.Regime}
                </span>
              )}
            </div>
          </div>

          <div className="self-start md:self-auto flex flex-col items-start md:items-end gap-3 shrink-0">
            {/* Só quando este mesmo CNPJ existe no Validador. Sem par, nenhum
                botão — em vez de um link que abriria uma empresa inexistente. */}
            {resp.companyId && (
              <Link
                href={`/c/${resp.companyId}/dashboard`}
                className="inline-flex items-center gap-2 bg-mint text-deep text-xs font-bold px-4 py-2 rounded-pill hover:bg-mint-400 transition-colors"
                title="Abrir este cliente no Validador de Emissões"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                Validador
              </Link>
            )}

            <button
              type="button"
              onClick={carregar}
              disabled={carregando}
              className="inline-flex items-center gap-2 text-xs font-semibold text-sand hover:text-mint-300 disabled:opacity-60"
              title="Buscar de novo no Acessórias"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${carregando ? "animate-spin" : ""}`} />
              {carregando ? "Atualizando…" : `Acessórias · ${horaCurta(resp.atualizadoEm)}`}
            </button>
          </div>
        </div>
      </header>

      {/* Alertas do diário sobem para o topo: é a primeira coisa que quem abre a ficha precisa ver. */}
      {alertas.length > 0 && (
        <div className="bg-clay/10 border border-clay/25 rounded-card-sm px-5 py-4">
          <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-clay-700">
            <AlertTriangle className="w-3.5 h-3.5" />
            {alertas.length === 1 ? "Alerta" : `${alertas.length} alertas`} deste cliente
          </span>
          <ul className="mt-2 space-y-1.5">
            {alertas.map((a) => (
              <li key={a.id} className="text-sm text-ink whitespace-pre-wrap flex gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-clay mt-2 shrink-0" />
                {a.texto.trim()}
              </li>
            ))}
          </ul>
        </div>
      )}

      {configPronta ? (
        <DadosAcessorias
          empresa={e}
          campos={config.campos}
          departamentos={config.departamentos ?? null}
          onConfigurar={() => setConfigAberta(true)}
        />
      ) : (
        <div className="h-40 rounded-card-sm bg-white border border-ink/5 animate-pulse" aria-busy="true" />
      )}

      <EditorDiario chave={chave} />

      <AcoesDiario empresas={[e]} onAtualizar={carregar} atualizando={carregando} />
      {configAberta && <ConfigCamposModal empresas={[e]} onFechar={() => setConfigAberta(false)} />}
    </div>
  );
}
