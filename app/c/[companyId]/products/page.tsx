import Link from "next/link";
import { listCompanyPlatforms, listProductsForPlatform } from "@/lib/actions/products";
import { Package } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageTitle } from "@/components/ui/PageTitle";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductsTable } from "@/components/products/ProductsTable";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ plataforma?: string; produto?: string }>;
}) {
  const { companyId } = await params;
  const sp = await searchParams;

  const platforms = await listCompanyPlatforms(companyId);
  const selectedPlatform = sp.plataforma && platforms.includes(sp.plataforma) ? sp.plataforma : platforms[0];
  const products = selectedPlatform ? await listProductsForPlatform(companyId, selectedPlatform) : [];

  return (
    <div className="space-y-6">
      <PageTitle sub="Percentual de comissão por produto, usado no cálculo do valor esperado da nota.">
        Produtos
      </PageTitle>

      {platforms.length === 0 ? (
        <Card>
          <EmptyState
            icon={Package}
            title="Nenhum produto identificado ainda"
            description="Os produtos aparecem aqui depois que um relatório de vendas da plataforma for importado para esta empresa."
            action={
              <Link href={`/c/${companyId}/imports/upload`}>
                <Button variant="solid">Importar Relatório</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-2 border-b border-ink/8 overflow-x-auto">
            {platforms.map((p) => (
              <Link
                key={p}
                href={`/c/${companyId}/products?plataforma=${encodeURIComponent(p)}`}
                className={`px-4 py-2.5 text-sm font-bold border-b-2 -mb-px whitespace-nowrap transition-colors ${
                  p === selectedPlatform ? "border-mint text-deep" : "border-transparent text-ink/45 hover:text-ink"
                }`}
              >
                {p}
              </Link>
            ))}
          </div>

          <ProductsTable
            companyId={companyId}
            plataforma={selectedPlatform!}
            products={products}
            initialOpenProduto={sp.produto}
          />
        </>
      )}
    </div>
  );
}
