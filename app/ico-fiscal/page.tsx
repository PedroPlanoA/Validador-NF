import { HubHeader, VoltarParaFerramentas } from "@/components/layout/HubHeader";
import { PainelIco } from "@/components/ico/PainelIco";

export default function IcoFiscalPage() {
  return (
    <main className="min-h-full bg-paper">
      <HubHeader titulo="ICO Fiscal" />
      <VoltarParaFerramentas />
      <PainelIco />
    </main>
  );
}
