"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mapSpreadsheet } from "@/lib/parsing/mapSpreadsheet";
import { rowsToCsv } from "@/lib/parsing/csvRows";
import { gzipText, BODY_ENCODING_HEADER } from "@/lib/parsing/gzipText";
import { mapInvoiceRow, mapSaleRow } from "@/lib/mapping/applyMapping";
import { Button } from "@/components/ui/Button";
import { Label, Select, Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { formatCompetencia } from "@/lib/format/competencia";
import { CheckCircle2 } from "lucide-react";
import type { EmitterMappings, PlatformMappings, RawRow } from "@/lib/mapping/types";

interface PlatformOption {
  id: string;
  name: string;
  mappings: PlatformMappings;
  currencyCol?: string;
}

interface EmitterOption {
  id: string;
  name: string;
  mappings: EmitterMappings;
}

export function UploadForm({
  companyId,
  platformConfigs,
  emitterConfigs,
}: {
  companyId: string;
  platformConfigs: PlatformOption[];
  emitterConfigs: EmitterOption[];
}) {
  const router = useRouter();
  const [sourceType, setSourceType] = useState<"PLATFORM" | "EMITTER">("PLATFORM");
  const [configId, setConfigId] = useState("");
  const [referenceCompetencia, setReferenceCompetencia] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "parsing" | "uploading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [doneRowCount, setDoneRowCount] = useState<number | null>(null);

  const options = sourceType === "PLATFORM" ? platformConfigs : emitterConfigs;
  const platformConfig = platformConfigs.find((c) => c.id === configId);
  const emitterConfig = emitterConfigs.find((c) => c.id === configId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !configId || !referenceCompetencia) return;
    if (sourceType === "PLATFORM" ? !platformConfig : !emitterConfig) {
      setStatus("error");
      setMessage("Mapeamento selecionado não encontrado. Recarregue a página e tente novamente.");
      return;
    }

    setStatus("parsing");
    setMessage(null);
    try {
      // As colunas são extraídas aqui, no navegador, linha por linha: sobe só o
      // que o mapeamento usa, e não o relatório inteiro. Depois o CSV vai
      // comprimido. Juntas, as duas coisas multiplicam por muitas vezes o
      // tamanho de arquivo que passa pelo limite de corpo da plataforma.
      const mapRow: (row: RawRow) => Record<string, string> =
        sourceType === "PLATFORM"
          ? (row) => mapSaleRow(row, platformConfig!.mappings, platformConfig!.currencyCol)
          : (row) => mapInvoiceRow(row, emitterConfig!.mappings);

      const mappedRows = await mapSpreadsheet(file, mapRow);
      if (mappedRows.length === 0) {
        setStatus("error");
        setMessage("O arquivo não contém linhas de dados.");
        return;
      }

      setStatus("uploading");
      const { body, encoding } = await gzipText(rowsToCsv(mappedRows));
      const query = new URLSearchParams({
        sourceType,
        configId,
        filename: file.name,
        referenceCompetencia,
      });
      const res = await fetch(`/api/c/${companyId}/imports?${query}`, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream", [BODY_ENCODING_HEADER]: encoding },
        body,
      });

      if (!res.ok) {
        setStatus("error");
        if (res.status === 413) {
          setMessage(
            `Arquivo ainda muito grande para importar (${mappedRows.length.toLocaleString("pt-BR")} linhas). Avise o time de desenvolvimento — o caminho a partir daqui é subir o arquivo direto para o armazenamento.`,
          );
        } else {
          const data = await res.json().catch(() => null);
          setMessage(data?.error ?? `Erro ao importar arquivo (HTTP ${res.status}).`);
        }
        return;
      }

      const data = await res.json();
      setStatus("done");
      setDoneRowCount(data.rowCount);
      // O seletor de competência vive na faixa lateral, renderizada pelo layout
      // da empresa — que o Next mantém em cache no cliente e não re-renderiza
      // ao navegar. Sem este refresh, a competência recém-importada só aparecia
      // depois de recarregar a página na mão.
      router.refresh();
    } catch (err) {
      setStatus("error");
      const detail = err instanceof Error ? err.message : String(err);
      setMessage(`Não foi possível ler o arquivo (${detail}). Verifique o formato (CSV, XLS ou XLSX).`);
    }
  }

  return (
    <Card className="p-6 max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Tipo de Fonte</Label>
          <Select
            value={sourceType}
            onChange={(e) => {
              setSourceType(e.target.value as "PLATFORM" | "EMITTER");
              setConfigId("");
            }}
          >
            <option value="PLATFORM">Plataforma de Venda</option>
            <option value="EMITTER">Emissor de Nota Fiscal</option>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>{sourceType === "PLATFORM" ? "Plataforma" : "Emissor"}</Label>
          <Select value={configId} onChange={(e) => setConfigId(e.target.value)} required>
            <option value="">Selecione...</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
          {options.length === 0 && (
            <p className="text-xs text-attention">
              Nenhum mapeamento cadastrado ainda para este tipo de fonte.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Arquivo (CSV, XLS ou XLSX)</Label>
          <input
            type="file"
            accept=".csv,.xls,.xlsx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm border-2 border-dashed border-ink/15 rounded-input p-4 cursor-pointer hover:border-mint transition-colors"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label>Competência de Referência (mês/ano do arquivo)</Label>
          <Input
            type="month"
            value={referenceCompetencia}
            onChange={(e) => setReferenceCompetencia(e.target.value)}
            onClick={(e) => e.currentTarget.showPicker?.()}
            required
          />
          <p className="text-[11px] text-ink/40">
            Apenas para você localizar este arquivo depois na lista de importações — não define a competência da
            análise, do checklist ou de qualquer relatório
            {referenceCompetencia ? ` (ex: "${formatCompetencia(referenceCompetencia)}")` : ""}.
          </p>
        </div>

        <p className="text-xs text-ink/50">
          Reimportar um arquivo substitui apenas os dados da(s) competência(s) contida(s) nele, para esta fonte —
          outras competências e outras plataformas/emissores não são afetados.
        </p>

        {message && (
          <p className={`text-sm ${status === "error" ? "text-danger" : "text-positive"}`}>{message}</p>
        )}

        <Button
          type="submit"
          disabled={!file || !configId || !referenceCompetencia || status === "parsing" || status === "uploading"}
        >
          {status === "parsing" ? "Lendo arquivo..." : status === "uploading" ? "Importando..." : "Importar"}
        </Button>
      </form>

      {status === "done" && (
        <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-card-sm shadow-card-hover w-full max-w-sm p-6 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-positive mx-auto" />
            <div>
              <h3 className="font-serif font-black text-lg text-deep">Importação concluída</h3>
              <p className="text-sm text-ink/60 mt-1">
                {doneRowCount} linha{doneRowCount === 1 ? "" : "s"} importada{doneRowCount === 1 ? "" : "s"} com
                sucesso.
              </p>
            </div>
            <Button
              className="w-full justify-center"
              onClick={() => {
                router.push(`/c/${companyId}/imports`);
                router.refresh();
              }}
            >
              Voltar para Importações
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
