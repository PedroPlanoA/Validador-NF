import { listCompanies } from "@/lib/actions/companies";
import { CompaniesManager } from "@/components/company/CompaniesManager";
import { HubHeader, HubTitle, VoltarParaFerramentas } from "@/components/layout/HubHeader";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const companies = await listCompanies();

  return (
    <main className="min-h-full bg-paper">
      <HubHeader titulo="Validador de Emissões" />
      <VoltarParaFerramentas />

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <HubTitle sub="Selecione uma empresa abaixo para acessar dashboard, conferência e importações.">
          Escolha uma empresa
        </HubTitle>

        <CompaniesManager companies={companies} />
      </div>
    </main>
  );
}
