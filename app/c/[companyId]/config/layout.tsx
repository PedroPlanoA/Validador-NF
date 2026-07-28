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
      <PageTitle>Mapear</PageTitle>
      <ConfigTabs basePath={`/c/${companyId}/config`} />
      <div className="pt-2">{children}</div>
    </div>
  );
}
