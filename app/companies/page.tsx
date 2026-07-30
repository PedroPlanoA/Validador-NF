import { FileSpreadsheet } from "lucide-react";
import { listCompanies } from "@/lib/actions/companies";
import { CompaniesManager } from "@/components/company/CompaniesManager";
import { BrandLockup } from "@/components/layout/BrandLockup";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const companies = await listCompanies();

  return (
    <main className="min-h-full bg-paper">
      {/* Faixa de marca — igual ao topo do site institucional */}
      <div className="relative overflow-hidden bg-deep px-8 py-7 flex items-center justify-between gap-4">
        <FileSpreadsheet className="absolute -right-6 -bottom-8 w-40 h-40 text-mint-300/10 rotate-[-8deg]" />
        <div className="relative">
          <BrandLockup size="lg" />
        </div>
        <h1 className="relative font-sans font-light text-2xl text-white/95 whitespace-nowrap tracking-[0.01em]">
          Conferência Fiscal
        </h1>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 space-y-8">
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
