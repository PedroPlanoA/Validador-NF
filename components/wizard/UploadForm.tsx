"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseSpreadsheet } from "@/lib/parsing/parseSpreadsheet";
import { rowsToCsv } from "@/lib/parsing/csvRows";
import { Button } from "@/components/ui/Button";
import { Label, Select, Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { formatCompetencia } from "@/lib/format/competencia";

interface ConfigOption {
  id: string;
  name: string;
}

export function UploadForm({
  companyId,
  platformConfigs,
  emitterConfigs,
}: {
  companyId: string;
  platformConfigs: ConfigOption[];
  emitterConfigs: ConfigOption[];
}) {
  const router = useRouter();
  const [sourceType, setSourceType] = useState<"PLATFORM" | "EMITTER">("PLATFORM");
  const [configId, setConfigId] = useState("");
  const [referenceCompetencia, setReferenceCompetencia] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "parsing" | "uploading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const options = sourceType === "PLATFORM" ? platformConfigs : emitterConfigs;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !configId || !referenceCompetencia) return;

    setStatus("parsing");
    setMessage(null);
    try {
      const { rows } = await parseSpreadsheet(file);
      if (rows.length === 0) {
        setStatus("error");
        setMessage("O arquivo não contém linhas de dados.");
        return;
      }

      setStatus("uploading");
      const rawCsv = rowsToCsv(rows);
      const res = await fetch(`/api/c/${companyId}/imports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceType, configId, filename: file.name, rawCsv, referenceCompetencia }),
      });

      if (!res.ok) {
        setStatus("error");
        if (res.status === 413) {
          setMessage("Arquivo muito grande para importar. Divida o relatório em partes menores e tente novamente.");
        } else {
          const data = await res.json().catch(() => null);
          setMessage(data?.error ?? `Erro ao importar arquivo (HTTP ${res.status}).`);
        }
        return;
      }

      const data = await res.json();
      setStatus("done");
      setMessage(`Importado: ${data.rowCount} linhas.`);
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
    </Card>
  );
}
