import { listPlatformConfigs } from "@/lib/actions/platformConfigs";
import { listEmitterConfigs } from "@/lib/actions/emitterConfigs";
import { UploadForm } from "@/components/wizard/UploadForm";

export default async function UploadPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const [platformConfigs, emitterConfigs] = await Promise.all([
    listPlatformConfigs(),
    listEmitterConfigs(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-base font-bold text-ink">Importar Relatório</h1>
      <UploadForm
        companyId={companyId}
        platformConfigs={platformConfigs.map((c) => ({ id: c.id, name: c.name }))}
        emitterConfigs={emitterConfigs.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
