import { HubHeader, HubTitle, VoltarParaFerramentas } from "@/components/layout/HubHeader";
import { DominioConverterForm } from "@/components/tools/DominioConverterForm";

export default function ConversorDominioPage() {
  return (
    <main className="min-h-full bg-paper">
      <HubHeader titulo="Conversor" />
      <VoltarParaFerramentas />

      {/* A coluna acompanha a largura do formulário: com o container largo, os
          campos ficavam encostados à esquerda de um espaço vazio. */}
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        <HubTitle sub="Serviços tomados ou prestados. Escolha o modelo, preencha os parâmetros do lançamento, envie a planilha e baixe o TXT de importação.">
          NFS-e do emissor nacional → Domínio
        </HubTitle>

        <DominioConverterForm />
      </div>
    </main>
  );
}
