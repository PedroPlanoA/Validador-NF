import { HubHeader, HubTitle, VoltarParaFerramentas } from "@/components/layout/HubHeader";
import { ExtratorNacionalFrame } from "@/components/tools/ExtratorNacionalFrame";

export default function ExtratorNacionalPage() {
  return (
    <main className="min-h-full bg-paper">
      <HubHeader titulo="Extrair notas do Emissor Nacional" />
      <VoltarParaFerramentas />

      {/* Mais largo que as outras ferramentas: aqui dentro cabe a tabela de notas
          inteira, que é o conteúdo da tela, não um formulário. */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <HubTitle sub="Lê as notas emitidas e tomadas direto da API oficial do ADN, com o certificado digital da empresa. Roda na sua máquina — o certificado nunca sai dela.">
          Emissor Nacional
        </HubTitle>

        <ExtratorNacionalFrame />
      </div>
    </main>
  );
}
