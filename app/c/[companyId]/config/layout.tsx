import { PageTitle } from "@/components/ui/PageTitle";
import { ConfigTabs } from "@/components/layout/ConfigTabs";

export default async function CompanyConfigLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;

  return (
    <div className="space-y-6">
      <div>
        <PageTitle>Mapear</PageTitle>
        <p className="text-xs text-ink/50 mt-1">
          Mapeamentos são globais — o que você configurar aqui vale para a importação de qualquer empresa.
        </p>
      </div>
      <ConfigTabs basePath={`/c/${companyId}/config`} />
      <div className="pt-2">{children}</div>
    </div>
  );
}
