import { notFound } from "next/navigation";
import { getPlatformConfig } from "@/lib/actions/platformConfigs";
import { MappingWizard } from "@/components/wizard/MappingWizard";

export const dynamic = "force-dynamic";

export default async function EditCompanyPlatformConfigPage({
  params,
}: {
  params: Promise<{ companyId: string; configId: string }>;
}) {
  const { companyId, configId } = await params;
  const config = await getPlatformConfig(configId);
  if (!config) notFound();

  return (
    <div className="space-y-6">
      <h2 className="text-base font-bold text-ink">Editar Mapeamento — {config.name}</h2>
      <MappingWizard
        kind="platform"
        basePath={`/c/${companyId}/config`}
        existingConfig={{
          id: config.id,
          name: config.name,
          mappings: config.mappings as unknown as Record<string, string>,
          cleanupChars: config.cleanupChars,
          statusMap: config.statusMap as unknown as Record<string, string>,
          commType: config.commType,
          fixedCommValue: config.fixedCommValue,
          currencyMode: config.currencyMode,
          fixedCurrency: config.fixedCurrency,
          currencyCol: config.currencyCol,
        }}
      />
    </div>
  );
}
