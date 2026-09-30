import { HubHeader, HubTitle, VoltarParaFerramentas } from "@/components/layout/HubHeader";
import { ListaClientes } from "@/components/diario/ListaClientes";

export default function DiarioClientePage() {
  return (
    <main className="min-h-full bg-paper">
      <HubHeader titulo="Diário do Cliente" />
      <VoltarParaFerramentas />
      <div className="max-w-6xl mx-auto px-6 py-8 pb-28 space-y-8">
        <HubTitle sub="Selecione um cliente para abrir a ficha e o diário do cliente.">Escolha um cliente</HubTitle>
        <ListaClientes />
      </div>
    </main>
  );
}
