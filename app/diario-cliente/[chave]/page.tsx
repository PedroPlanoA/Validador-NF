import { HubHeader, VoltarParaFerramentas } from "@/components/layout/HubHeader";
import { FichaCliente } from "@/components/diario/FichaCliente";

export default async function FichaClientePage({ params }: { params: Promise<{ chave: string }> }) {
  const { chave } = await params;
  return (
    <main className="min-h-full bg-paper">
      <HubHeader titulo="Diário do Cliente" />
      <VoltarParaFerramentas label="Clientes" href="/diario-cliente" />
      <div className="max-w-6xl mx-auto px-6 py-8 pb-28">
        <FichaCliente chave={chave.replace(/\D/g, "")} />
      </div>
    </main>
  );
}
