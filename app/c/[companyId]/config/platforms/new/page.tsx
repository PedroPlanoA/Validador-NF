import { MappingWizard } from "@/components/wizard/MappingWizard";

export default async function NewPlatformConfigPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  return (
    <div className="space-y-6">
      <h1 className="text-base font-bold text-ink">Novo Mapeamento de Plataforma</h1>
      <MappingWizard kind="platform" companyId={companyId} />
    </div>
  );
}
