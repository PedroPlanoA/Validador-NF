import { MappingWizard } from "@/components/wizard/MappingWizard";

export default async function NewCompanyEmitterConfigPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  return (
    <div className="space-y-6">
      <h2 className="text-base font-bold text-ink">Novo Mapeamento</h2>
      <MappingWizard kind="emitter" basePath={`/c/${companyId}/config`} />
    </div>
  );
}
