import { MappingWizard } from "@/components/wizard/MappingWizard";

export default function NewEmitterConfigPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-base font-bold text-ink">Novo Mapeamento de Emissor</h2>
      <MappingWizard kind="emitter" />
    </div>
  );
}
