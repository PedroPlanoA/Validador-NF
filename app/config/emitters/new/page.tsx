import { Suspense } from "react";
import { MappingWizard } from "@/components/wizard/MappingWizard";

export const dynamic = "force-dynamic";

export default function NewEmitterConfigPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-base font-bold text-ink">Novo Mapeamento</h2>
      <Suspense>
        <MappingWizard kind="emitter" />
      </Suspense>
    </div>
  );
}
