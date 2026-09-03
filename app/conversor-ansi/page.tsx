import { HubHeader, HubTitle, VoltarParaFerramentas } from "@/components/layout/HubHeader";
import { AnsiConverterForm } from "@/components/tools/AnsiConverterForm";

export default function ConversorAnsiPage() {
  return (
    <main className="min-h-full bg-paper">
      <HubHeader titulo="Conversor ANSI" />
      <VoltarParaFerramentas />

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        <HubTitle sub="Converte arquivos .txt para a codificação ANSI (Windows-1252), que é o que os sistemas contábeis esperam na importação.">
          TXT → ANSI
        </HubTitle>

        <AnsiConverterForm />
      </div>
    </main>
  );
}
