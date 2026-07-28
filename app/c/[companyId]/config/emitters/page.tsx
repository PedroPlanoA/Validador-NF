import { EmittersListView } from "@/components/config/EmittersListView";

export const dynamic = "force-dynamic";

export default async function CompanyEmittersConfigPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  return <EmittersListView basePath={`/c/${companyId}/config`} />;
}
