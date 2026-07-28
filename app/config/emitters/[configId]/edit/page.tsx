import { notFound } from "next/navigation";
import { getEmitterConfig } from "@/lib/actions/emitterConfigs";
import { MappingWizard } from "@/components/wizard/MappingWizard";

export default async function EditEmitterConfigPage({
  params,
}: {
  params: Promise<{ configId: string }>;
}) {
  const { configId } = await params;
  const config = await getEmitterConfig(configId);
  if (!config) notFound();

  return (
    <div className="space-y-6">
      <h2 className="text-base font-bold text-ink">Editar Mapeamento — {config.name}</h2>
      <MappingWizard
        kind="emitter"
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
