import { db } from "@/lib/db";
import { getCompetenciaCookie } from "@/lib/actions/competenciaCookie";
import { formatCurrency } from "@/lib/validation/currency";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { PageTitle } from "@/components/ui/PageTitle";
import { formatCompetencia } from "@/lib/format/competencia";
import type { BadgeTone } from "@/components/ui/Badge";
import type { SituacaoNf } from "@/lib/mapping/types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

const NF_LABELS: Record<SituacaoNf, string> = {
  EMITIDO: "Emitido",
  CANCELADO: "Cancelado",
  ERRO_DE_EMISSAO: "Erro de Emissão",
  EM_EMISSAO: "Em Emissão",
  OUTRO: "Outro",
};

const NF_TONE: Record<SituacaoNf, BadgeTone> = {
  EMITIDO: "positive",
  CANCELADO: "neutral",
  ERRO_DE_EMISSAO: "danger",
  EM_EMISSAO: "primary",
  OUTRO: "neutral",
};

export default async function InvoicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ q?: string; status?: string; codigoServico?: string; page?: string }>;
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
    select: { situacaoNf: true, codigoServico: true },
  });
  const statusOptions = Array.from(new Set(allForFilters.map((i) => NF_LABELS[i.situacaoNf]))).sort();
  const servicoOptions = Array.from(new Set(allForFilters.map((i) => i.codigoServico).filter(Boolean))).sort();

  const where = {
    ...baseWhere,
    ...(sp.status ? { situacaoNf: (Object.keys(NF_LABELS) as SituacaoNf[]).find((k) => NF_LABELS[k] === sp.status) } : {}),
    ...(sp.codigoServico ? { codigoServico: sp.codigoServico } : {}),
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
      <PageTitle>Notas Fiscais</PageTitle>
      <Card className="overflow-hidden">
        <FilterBar
          searchPlaceholder="Pesquisar por código, comprador, NF..."
          filters={[
            { key: "status", label: "Todos os Status NF", options: statusOptions },
            { key: "codigoServico", label: "Todos os Serviços", options: servicoOptions },
          ]}
          resultCount={total}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-paper-alt/40 border-b border-ink/8 text-ink/50 font-bold uppercase tracking-wider">
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
            <tbody className="divide-y divide-ink/5 font-medium text-ink">
              {invoices.map((inv) => (
                <tr key={inv.id}>
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
                  <td colSpan={8} className="py-8 text-center text-ink/40 italic">
                    Nenhuma nota fiscal encontrada.
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
