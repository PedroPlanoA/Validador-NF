import { listCompanies } from "@/lib/actions/companies";
import { CompaniesManager } from "@/components/company/CompaniesManager";
import { HubHeader, VoltarParaFerramentas } from "@/components/layout/HubHeader";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const companies = await listCompanies();

  return (
    <main className="min-h-full bg-paper">
      <HubHeader titulo="Validador de Emissões" />

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <VoltarParaFerramentas />

        <div>
          <h2 className="font-serif text-3xl font-black text-deep">Escolha uma empresa</h2>
          <p className="text-sm text-ink/60 mt-1.5">
            Selecione uma empresa abaixo para acessar dashboard, conferência e importações.
          </p>
        </div>

        <CompaniesManager companies={companies} />
      </div>
    </main>
  );
}
