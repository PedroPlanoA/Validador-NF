import { getReconciliationRows } from "@/lib/actions/reconciliation";
import { getCompetenciaCookie } from "@/lib/actions/competenciaCookie";
import { formatCurrency } from "@/lib/validation/currency";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { PageTitle } from "@/components/ui/PageTitle";
import { SITUACAO_CONFERENCIA_LABELS, SITUACAO_CONFERENCIA_TONE } from "@/lib/reconciliation/labels";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(d);
}

export default async function SalesPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ q?: string; plataforma?: string; status?: string; moeda?: string; page?: string }>;
}) {
  const { companyId } = await params;
  const sp = await searchParams;
  const competencia = await getCompetenciaCookie(companyId);

  const allRows = await getReconciliationRows(companyId, competencia);

  const platformOptions = Array.from(new Set(allRows.map((r) => r.plataforma))).sort();
  const statusOptions = Array.from(new Set(allRows.map((r) => r.situacaoConferencia)))
    .map((s) => SITUACAO_CONFERENCIA_LABELS[s])
    .sort();
  const moedaOptions = Array.from(new Set(allRows.map((r) => r.moeda))).sort();

  let rows = allRows;
  if (sp.plataforma) rows = rows.filter((r) => r.plataforma === sp.plataforma);
  if (sp.status) rows = rows.filter((r) => SITUACAO_CONFERENCIA_LABELS[r.situacaoConferencia] === sp.status);
  if (sp.moeda) rows = rows.filter((r) => r.moeda === sp.moeda);
  if (sp.q) {
    const q = sp.q.toLowerCase();
    rows = rows.filter(
      (r) => r.codigoVenda.toLowerCase().includes(q) || r.comprador.toLowerCase().includes(q),
    );
  }

  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <PageTitle>Vendas</PageTitle>
      <Card className="overflow-hidden">
        <FilterBar
          searchPlaceholder="Pesquisar por código, comprador..."
          filters={[
            { key: "plataforma", label: "Todas as Plataformas", options: platformOptions },
            { key: "status", label: "Todos os Status", options: statusOptions },
            { key: "moeda", label: "Todas as Moedas", options: moedaOptions },
          ]}
          resultCount={rows.length}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-paper-alt/40 border-b border-ink/8 text-ink/50 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-5">Código Venda</th>
                <th className="py-3 px-5">Comprador</th>
                <th className="py-3 px-5">Plataforma</th>
                <th className="py-3 px-5">Data da Venda</th>
                <th className="py-3 px-5 text-right">Valor Venda</th>
                <th className="py-3 px-5 text-right">Valor Calc. NF</th>
                <th className="py-3 px-5">Conferência</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5 font-medium text-ink">
              {pageRows.map((r) => (
                <tr key={r.saleId}>
                  <td className="py-3 px-5">{r.codigoVenda}</td>
                  <td className="py-3 px-5">{r.comprador}</td>
                  <td className="py-3 px-5">{r.plataforma}</td>
                  <td className="py-3 px-5">{formatDate(r.dataVenda)}</td>
                  <td className="py-3 px-5 text-right">{formatCurrency(r.valorVenda, r.moeda)}</td>
                  <td className="py-3 px-5 text-right">{formatCurrency(r.valorNfCalculado, r.moeda)}</td>
                  <td className="py-3 px-5">
                    <Badge tone={SITUACAO_CONFERENCIA_TONE[r.situacaoConferencia]}>
                      {SITUACAO_CONFERENCIA_LABELS[r.situacaoConferencia]}
                    </Badge>
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-ink/40 italic">
                    Nenhuma venda encontrada.
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
