"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseSpreadsheet } from "@/lib/parsing/parseSpreadsheet";
import { Button } from "@/components/ui/Button";
import { Label, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

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
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "parsing" | "uploading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const options = sourceType === "PLATFORM" ? platformConfigs : emitterConfigs;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !configId) return;

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
      const res = await fetch(`/api/c/${companyId}/imports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceType, configId, filename: file.name, rawRows: rows }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Erro ao importar arquivo.");
        return;
      }
      setStatus("done");
      setMessage(
        `Importado: ${data.rowCount} linhas, competência(s) ${data.competencias.join(", ")}.`,
      );
      router.refresh();
    } catch {
      setStatus("error");
      setMessage("Não foi possível ler o arquivo. Verifique o formato (CSV, XLS ou XLSX).");
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

        <p className="text-xs text-ink/50">
          Reimportar um arquivo substitui apenas os dados da(s) competência(s) contida(s) nele, para esta fonte —
          outras competências e outras plataformas/emissores não são afetados.
        </p>

        {message && (
          <p className={`text-sm ${status === "error" ? "text-danger" : "text-positive"}`}>{message}</p>
        )}

        <Button type="submit" disabled={!file || !configId || status === "parsing" || status === "uploading"}>
          {status === "parsing" ? "Lendo arquivo..." : status === "uploading" ? "Importando..." : "Importar"}
        </Button>
      </form>
    </Card>
  );
}
