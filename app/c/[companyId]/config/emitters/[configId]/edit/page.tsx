import { notFound } from "next/navigation";
import { getEmitterConfig } from "@/lib/actions/emitterConfigs";
import { MappingWizard } from "@/components/wizard/MappingWizard";

export default async function EditEmitterConfigPage({
  params,
}: {
  params: Promise<{ companyId: string; configId: string }>;
}) {
  const { companyId, configId } = await params;
  const config = await getEmitterConfig(companyId, configId);
  if (!config) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-base font-bold text-ink">Editar Mapeamento — {config.name}</h1>
      <MappingWizard
        kind="emitter"
        companyId={companyId}
        existingConfig={{
          id: config.id,
          name: config.name,
          mappings: config.mappings as unknown as Record<string, string>,
          cleanupChars: config.cleanupChars,
          statusMap: config.statusMap as unknown as Record<string, string>,
          fallbackService: config.fallbackService,
        }}
      />
    </div>
  );
}
