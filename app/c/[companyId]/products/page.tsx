import Link from "next/link";
import { listCompanyPlatforms, listProductsForPlatform } from "@/lib/actions/products";
import { Card } from "@/components/ui/Card";
import { PageTitle } from "@/components/ui/PageTitle";
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
      <div>
        <PageTitle>Produtos</PageTitle>
        <p className="text-xs text-ink/50 mt-1">
          Produtos identificados nos relatórios de vendas importados desta empresa, por plataforma.
        </p>
      </div>

      {platforms.length === 0 ? (
        <Card className="p-8 text-center text-sm text-ink/40 italic">
          Nenhum produto identificado ainda — importe um relatório de vendas para esta empresa.
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-2 border-b border-ink/8 overflow-x-auto">
            {platforms.map((p) => (
              <Link
                key={p}
                href={`/c/${companyId}/products?plataforma=${encodeURIComponent(p)}`}
                className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors ${
                  p === selectedPlatform ? "border-mint text-ink" : "border-transparent text-ink/45 hover:text-ink"
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
