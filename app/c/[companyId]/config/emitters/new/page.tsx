import { MappingWizard } from "@/components/wizard/MappingWizard";

export default async function NewEmitterConfigPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  return (
    <div className="space-y-6">
      <h1 className="text-base font-bold text-ink">Novo Mapeamento de Emissor</h1>
      <MappingWizard kind="emitter" companyId={companyId} />
    </div>
  );
}
