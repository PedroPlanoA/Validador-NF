import { MappingWizard } from "@/components/wizard/MappingWizard";

export default function NewPlatformConfigPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-base font-bold text-ink">Novo Mapeamento de Plataforma</h2>
      <MappingWizard kind="platform" />
    </div>
  );
}
