import Link from "next/link";
import { listActiveBatches } from "@/lib/imports/importService";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageTitle } from "@/components/ui/PageTitle";
import { ReanalyzeButton } from "@/components/wizard/ReanalyzeButton";
import { DeleteBatchButton } from "@/components/wizard/DeleteBatchButton";
import { ImportsFilterBar } from "@/components/imports/ImportsFilterBar";
import { formatCompetencia } from "@/lib/format/competencia";
import { Upload, Download } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ImportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ fonte?: string; competenciaRef?: string; dataInicio?: string; dataFim?: string }>;
}) {
  const { companyId } = await params;
  const sp = await searchParams;

  // Not affected by the global competência selector — this screen must
  // always be able to show every active report, regardless of which
  // competência is currently selected elsewhere in the app.
  const allBatches = await listActiveBatches(companyId);

  const fontes = Array.from(
    new Set(allBatches.map((b) => b.platformConfig?.name ?? b.emitterConfig?.name).filter((x): x is string => !!x)),
  ).sort();
  const competencias = Array.from(
    new Set(allBatches.map((b) => b.referenceCompetencia).filter((x): x is string => !!x)),
  ).sort().reverse();

  let batches = allBatches;
  if (sp.fonte) {
    batches = batches.filter((b) => (b.platformConfig?.name ?? b.emitterConfig?.name) === sp.fonte);
  }
  if (sp.competenciaRef) {
    batches = batches.filter((b) => b.referenceCompetencia === sp.competenciaRef);
  }
  if (sp.dataInicio) {
    batches = batches.filter((b) => b.importedAt >= new Date(`${sp.dataInicio}T00:00:00`));
  }
  if (sp.dataFim) {
    batches = batches.filter((b) => b.importedAt <= new Date(`${sp.dataFim}T23:59:59`));
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageTitle>Importações</PageTitle>
        <Link href={`/c/${companyId}/imports/upload`}>
          <Button>
            <Upload className="w-4 h-4" /> Importar Relatório
          </Button>
        </Link>
      </div>

      <ImportsFilterBar fontes={fontes} competencias={competencias} />

      {batches.length === 0 ? (
        <p className="text-sm text-ink/40 italic">
          {allBatches.length === 0 ? "Nenhum arquivo importado ainda." : "Nenhum arquivo corresponde aos filtros."}
        </p>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-paper-alt/50 border-b border-ink/8 text-ink/50 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-5">Fonte</th>
                <th className="py-3 px-5">Tipo</th>
                <th className="py-3 px-5">Competência de Referência</th>
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
                  <td className="py-3 px-5">
                    {batch.referenceCompetencia ? formatCompetencia(batch.referenceCompetencia) : "—"}
                  </td>
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
            className="py-2.5 px-4 border border-positive/25 hover:bg-positive/10 text-positive text-xs font-bold rounded-input flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Baixar Vendas (XLSX)
          </a>
          <a
            href={`/api/c/${companyId}/export/invoices`}
            className="py-2.5 px-4 border border-positive/25 hover:bg-positive/10 text-positive text-xs font-bold rounded-input flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Baixar Notas (XLSX)
          </a>
        </div>
      </Card>
    </div>
  );
}
