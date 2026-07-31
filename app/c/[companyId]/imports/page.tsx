import Link from "next/link";
import { listActiveBatches } from "@/lib/imports/importService";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageTitle";
import { ReanalyzeButton } from "@/components/wizard/ReanalyzeButton";
import { DeleteBatchButton } from "@/components/wizard/DeleteBatchButton";
import { ImportsFilterBar } from "@/components/imports/ImportsFilterBar";
import { UnmappedStatusAlert } from "@/components/imports/UnmappedStatusAlert";
import { listUnmappedStatuses } from "@/lib/actions/unmappedStatuses";
import { ExportRawDataButton } from "@/components/ui/ExportRawDataButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { TABLE_CLASS, THEAD_CLASS, TBODY_CLASS, TR_CLASS } from "@/components/ui/Table";
import { formatCompetencia } from "@/lib/format/competencia";
import { Upload, FileSpreadsheet } from "lucide-react";

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
  const [allBatches, unmapped] = await Promise.all([
    listActiveBatches(companyId),
    listUnmappedStatuses(companyId),
  ]);

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
      {/* Exportar Dados Brutos vive no cabeçalho, na mesma posição das outras
          abas; Importar Relatório fica na linha dos filtros, junto do conteúdo
          que a pessoa está manipulando. */}
      <PageHeader title="Importações" sub={`${allBatches.length} relatório(s) ativo(s)`}>
        <ExportRawDataButton
          options={[
            { label: "Baixar Vendas (XLSX)", href: `/api/c/${companyId}/export/sales` },
            { label: "Baixar Notas (XLSX)", href: `/api/c/${companyId}/export/invoices` },
          ]}
        />
      </PageHeader>

      <UnmappedStatusAlert companyId={companyId} unmapped={unmapped} />

      <div className="flex flex-wrap items-center gap-3">
        <ImportsFilterBar fontes={fontes} competencias={competencias} />
        <Link href={`/c/${companyId}/imports/upload`} className="shrink-0">
          <Button variant="solid">
            <Upload className="w-4 h-4" /> Importar Relatório
          </Button>
        </Link>
      </div>

      {batches.length === 0 ? (
        <Card>
          <EmptyState
            icon={FileSpreadsheet}
            title={allBatches.length === 0 ? "Nenhum arquivo importado ainda" : "Nenhum arquivo com estes filtros"}
            description={
              allBatches.length === 0
                ? "Importe o relatório de vendas da plataforma e o relatório de notas do emissor para começar a conferência."
                : "Existem relatórios importados, mas nenhum corresponde aos filtros aplicados."
            }
            action={
              allBatches.length === 0 ? (
                <Link href={`/c/${companyId}/imports/upload`}>
                  <Button variant="solid">
                    <Upload className="w-4 h-4" /> Importar Relatório
                  </Button>
                </Link>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className={`${TABLE_CLASS} whitespace-nowrap`}>
            <thead className={THEAD_CLASS}>
              <tr>
                <th className="py-3 px-5">Fonte</th>
                <th className="py-3 px-5">Tipo</th>
                <th className="py-3 px-5">Competência de Referência</th>
                <th className="py-3 px-5">Importado em</th>
                <th className="py-3 px-5">Ação</th>
              </tr>
            </thead>
            <tbody className={TBODY_CLASS}>
              {batches.map((batch) => (
                <tr key={batch.id} className={TR_CLASS}>
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
    </div>
  );
}
