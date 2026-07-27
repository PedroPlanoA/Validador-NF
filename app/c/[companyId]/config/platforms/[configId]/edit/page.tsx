import { notFound } from "next/navigation";
import { getPlatformConfig } from "@/lib/actions/platformConfigs";
import { MappingWizard } from "@/components/wizard/MappingWizard";

export default async function EditPlatformConfigPage({
  params,
}: {
  params: Promise<{ companyId: string; configId: string }>;
}) {
  const { companyId, configId } = await params;
  const config = await getPlatformConfig(companyId, configId);
  if (!config) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-base font-bold text-ink">Editar Mapeamento — {config.name}</h1>
      <MappingWizard
        kind="platform"
        companyId={companyId}
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
