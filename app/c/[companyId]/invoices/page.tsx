import { db } from "@/lib/db";
import { getCompetenciaCookie } from "@/lib/actions/competenciaCookie";
import { formatCurrency } from "@/lib/validation/currency";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { PageHeader } from "@/components/ui/PageTitle";
import { ExportRawDataButton } from "@/components/ui/ExportRawDataButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { TABLE_CLASS, THEAD_CLASS, TBODY_CLASS, TR_CLASS } from "@/components/ui/Table";
import { FileText } from "lucide-react";
import { formatCompetencia } from "@/lib/format/competencia";
import { SITUACAO_NF_LABELS as NF_LABELS, SITUACAO_NF_TONE as NF_TONE } from "@/lib/reconciliation/labels";
import type { SituacaoNf } from "@/lib/mapping/types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function InvoicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ q?: string; status?: string; codigoServico?: string; tipo?: string; page?: string }>;
}) {
  const { companyId } = await params;
  const sp = await searchParams;
  const competencia = await getCompetenciaCookie(companyId);

  const baseWhere = {
    companyId,
    ...(competencia ? { competencia } : {}),
  };

  const allForFilters = await db.invoice.findMany({
    where: baseWhere,
    select: { situacaoNf: true, codigoServico: true, tipo: true },
  });
  const statusOptions = Array.from(new Set(allForFilters.map((i) => NF_LABELS[i.situacaoNf]))).sort();
  const servicoOptions = Array.from(new Set(allForFilters.map((i) => i.codigoServico).filter(Boolean))).sort();
  const tipoOptions = Array.from(new Set(allForFilters.map((i) => i.tipo).filter(Boolean))).sort();

  const where = {
    ...baseWhere,
    ...(sp.status ? { situacaoNf: (Object.keys(NF_LABELS) as SituacaoNf[]).find((k) => NF_LABELS[k] === sp.status) } : {}),
    ...(sp.codigoServico ? { codigoServico: sp.codigoServico } : {}),
    ...(sp.tipo ? { tipo: sp.tipo } : {}),
    ...(sp.q
      ? {
          OR: [
            { codigoVenda: { contains: sp.q, mode: "insensitive" as const } },
            { comprador: { contains: sp.q, mode: "insensitive" as const } },
            { numero: { contains: sp.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const [total, invoices] = await Promise.all([
    db.invoice.count({ where }),
    db.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notas Fiscais"
        sub={`${total} nota(s) ${competencia ? `em ${formatCompetencia(competencia)}` : "no total"}`}
      >
        <ExportRawDataButton
          options={[
            {
              label: "Baixar Notas (XLSX)",
              href: `/api/c/${companyId}/export/invoices${competencia ? `?competencia=${competencia}` : ""}`,
            },
          ]}
        />
      </PageHeader>
      <Card className="overflow-hidden">
        <FilterBar
          searchPlaceholder="Pesquisar por código, comprador, NF..."
          filters={[
            { key: "status", label: "Todos os Status NF", options: statusOptions },
            { key: "codigoServico", label: "Todos os Serviços", options: servicoOptions },
            { key: "tipo", label: "Todos os Tipos", options: tipoOptions },
          ]}
          resultCount={total}
        />
        <div className="overflow-x-auto">
          <table className={`${TABLE_CLASS} whitespace-nowrap`}>
            <thead className={THEAD_CLASS}>
              <tr>
                <th className="py-3 px-5">Código Venda</th>
                <th className="py-3 px-5">Número NF</th>
                <th className="py-3 px-5">Comprador</th>
                <th className="py-3 px-5">Status NF</th>
                <th className="py-3 px-5 text-right">Valor NF</th>
                <th className="py-3 px-5">Competência</th>
                <th className="py-3 px-5">Tipo</th>
                <th className="py-3 px-5">Cód. Serviço</th>
              </tr>
            </thead>
            <tbody className={TBODY_CLASS}>
              {invoices.map((inv) => (
                <tr key={inv.id} className={TR_CLASS}>
                  <td className="py-3 px-5">{inv.codigoVenda}</td>
                  <td className="py-3 px-5">{inv.numero}</td>
                  <td className="py-3 px-5">{inv.comprador}</td>
                  <td className="py-3 px-5">
                    <Badge tone={NF_TONE[inv.situacaoNf]}>{NF_LABELS[inv.situacaoNf]}</Badge>
                  </td>
                  <td className="py-3 px-5 text-right">{formatCurrency(inv.valorNf, "BRL")}</td>
                  <td className="py-3 px-5">{formatCompetencia(inv.competencia)}</td>
                  <td className="py-3 px-5">{inv.tipo}</td>
                  <td className="py-3 px-5">{inv.codigoServico}</td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      icon={FileText}
                      title="Nenhuma nota fiscal encontrada"
                      description="Ajuste os filtros ou a competência selecionada no menu lateral. Se ainda não importou o relatório do emissor, faça isso na aba Importações."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} />
      </Card>
    </div>
  );
}
