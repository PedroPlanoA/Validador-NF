"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Modal } from "@/components/diario/Modal";
import { Button } from "@/components/ui/Button";

/**
 * Baixa o arquivo da base já com a carteira do Acessórias preenchida.
 *
 * O período é escolhido aqui porque ele vai gravado na própria planilha
 * (Data Início / Data Fim da aba Base de Dados) — é o que as fórmulas usam
 * para recortar o trimestre. Antes isso era digitado à mão a cada rodada.
 */
const MESES_DO_TRI = [
  [0, 2],
  [3, 5],
  [6, 8],
  [9, 11],
];

function periodoDoTri(ano: number, tri: number): { inicio: string; fim: string } {
  const [pri, ult] = MESES_DO_TRI[tri - 1];
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return {
    inicio: iso(new Date(Date.UTC(ano, pri, 1))),
    fim: iso(new Date(Date.UTC(ano, ult + 1, 0))),
  };
}

const porExtenso = (iso: string) => iso.split("-").reverse().join("/");

export function BaixarArquivo({ className }: { className?: string }) {
  const hoje = new Date();
  const [aberto, setAberto] = useState(false);
  const [ano, setAno] = useState(hoje.getUTCFullYear());
  const [tri, setTri] = useState(Math.floor(hoje.getUTCMonth() / 3) + 1);
  const [baixando, setBaixando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const periodo = periodoDoTri(ano, tri);

  async function baixar() {
    setBaixando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/ico-fiscal/arquivo?inicio=${periodo.inicio}&fim=${periodo.fim}`);
      if (!res.ok) {
        const corpo = await res.json().catch(() => null);
        setErro(corpo?.erro ?? `Não foi possível montar o arquivo (HTTP ${res.status}).`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Dados ICO Fiscal ${ano} T${tri}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setAberto(false);
    } catch {
      setErro("Falha de rede ao baixar o arquivo.");
    } finally {
      setBaixando(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className={
          className ??
          "inline-flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-pill border border-ink/15 text-ink hover:border-mint hover:text-mint-700"
        }
      >
        <Download className="w-4 h-4" /> Baixar arquivo da base
      </button>

      {aberto && (
        <Modal
          titulo="Baixar arquivo da base"
          sub="As empresas vêm do Acessórias; Domínio e Digisac você preenche."
          onFechar={() => (baixando ? null : setAberto(false))}
          largura="max-w-md"
        >
          <div className="space-y-4">
            <div className="flex gap-3 items-end">
              <label className="text-sm">
                <span className="block font-semibold mb-1">Ano</span>
                <input
                  type="number"
                  value={ano}
                  min={2020}
                  max={2100}
                  onChange={(e) => setAno(Number(e.target.value))}
                  className="w-28 px-3 py-2 border border-ink/15 rounded-xl outline-none focus:border-mint"
                />
              </label>
              <div className="text-sm">
                <span className="block font-semibold mb-1">Trimestre</span>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTri(t)}
                      className={`w-11 py-2 rounded-xl border text-sm font-semibold transition ${
                        t === tri
                          ? "border-mint bg-mint/12 text-mint-700"
                          : "border-ink/15 text-text-2 hover:border-mint/60"
                      }`}
                    >
                      {t}º
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-[13px] text-text-2">
              Período gravado na planilha: <b>{porExtenso(periodo.inicio)}</b> a <b>{porExtenso(periodo.fim)}</b>.
            </p>

            <p className="text-[13px] text-text-2 border-l-2 border-ink/15 pl-3">
              Vêm preenchidas: <b>Acessórias-Empresas</b> (carteira inteira, com o responsável de cada departamento) e
              o período da <b>Base de Dados</b>. Continuam para preencher à mão: <b>Domínio</b>, <b>Obrigações
              Acessórias</b>, <b>Digisac</b> e <b>Contatos</b>.
            </p>

            {erro && <p className="text-[13px] text-danger bg-danger/8 rounded-xl px-3 py-2">{erro}</p>}

            <div className="flex gap-2 pt-1">
              <Button onClick={baixar} disabled={baixando}>
                {baixando && <Loader2 className="w-4 h-4 animate-spin" />}
                {baixando ? "Buscando no Acessórias…" : "Baixar"}
              </Button>
              <Button variant="ghost" onClick={() => setAberto(false)} disabled={baixando}>
                Cancelar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
