import Link from "next/link";
import { listActiveBatches } from "@/lib/imports/importService";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ReanalyzeButton } from "@/components/wizard/ReanalyzeButton";
import { DeleteBatchButton } from "@/components/wizard/DeleteBatchButton";
import { Upload, Download } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ImportsPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const batches = await listActiveBatches(companyId);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-ink">Relatórios Ativos na Base</h1>
          <p className="text-xs text-ink/50 mt-1">
            Confira quais arquivos estão lançados antes de fechar a conferência.
          </p>
        </div>
        <Link href={`/c/${companyId}/imports/upload`}>
          <Button>
            <Upload className="w-4 h-4" /> Importar Relatório
          </Button>
        </Link>
      </div>

      {batches.length === 0 ? (
        <p className="text-sm text-ink/40 italic">Nenhum arquivo importado ainda.</p>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-paper-alt/50 border-b border-ink/8 text-ink/50 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-5">Fonte</th>
                <th className="py-3 px-5">Tipo</th>
                <th className="py-3 px-5">Arquivo</th>
                <th className="py-3 px-5">Competência(s)</th>
                <th className="py-3 px-5 text-right">Linhas</th>
                <th className="py-3 px-5">Importado em</th>
                <th className="py-3 px-5">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5 font-medium text-ink">
              {batches.map((batch) => (
                <tr key={batch.id}>
                  <td className="py-3 px-5">
                    {batch.platformConfig?.name ?? batch.emitterConfig?.name ?? "—"}
                  </td>
                  <td className="py-3 px-5">
                    {batch.sourceType === "PLATFORM" ? "Plataforma" : "Emissor"}
                  </td>
                  <td className="py-3 px-5 max-w-[220px] truncate" title={batch.originalFilename}>
                    {batch.originalFilename}
                  </td>
                  <td className="py-3 px-5">{batch.competencias.join(", ") || "—"}</td>
                  <td className="py-3 px-5 text-right">{batch.rowCount}</td>
                  <td className="py-3 px-5">{new Date(batch.importedAt).toLocaleString("pt-BR")}</td>
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-4">
                      <ReanalyzeButton companyId={companyId} batchId={batch.id} />
                      <DeleteBatchButton
                        companyId={companyId}
                        batchId={batch.id}
                        filename={batch.originalFilename}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-bold text-ink">Exportar Dados Brutos</h3>
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <a
            href={`/api/c/${companyId}/export/sales`}
            className="py-2.5 px-4 border border-status-success/25 hover:bg-status-success/10 text-status-success text-xs font-bold rounded-input flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Baixar Vendas (XLSX)
          </a>
          <a
            href={`/api/c/${companyId}/export/invoices`}
            className="py-2.5 px-4 border border-status-success/25 hover:bg-status-success/10 text-status-success text-xs font-bold rounded-input flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Baixar Notas (XLSX)
          </a>
        </div>
      </Card>
    </div>
  );
}
