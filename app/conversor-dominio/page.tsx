import { HubHeader, VoltarParaFerramentas } from "@/components/layout/HubHeader";
import { DominioConverterForm } from "@/components/tools/DominioConverterForm";

export default function ConversorDominioPage() {
  return (
    <main className="min-h-full bg-paper">
      <HubHeader titulo="Conversor de Leiaute" />

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <VoltarParaFerramentas />

        <div>
          <h2 className="font-serif text-3xl font-black text-deep">NFS-e do emissor nacional → Domínio</h2>
          <p className="text-sm text-ink/60 mt-1.5">
            Serviços tomados. Preencha os parâmetros do lançamento, envie a planilha e baixe o TXT de importação.
          </p>
        </div>

        <DominioConverterForm />
      </div>
    </main>
  );
}
