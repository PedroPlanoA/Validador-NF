import { PlatformsListView } from "@/components/config/PlatformsListView";

export const dynamic = "force-dynamic";

export default async function CompanyPlatformsConfigPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  return <PlatformsListView basePath={`/c/${companyId}/config`} />;
}
