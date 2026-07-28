import { FileSpreadsheet } from "lucide-react";
import { listCompanies } from "@/lib/actions/companies";
import { CompaniesManager } from "@/components/company/CompaniesManager";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const companies = await listCompanies();

  return (
    <main className="min-h-full bg-paper">
      {/* Faixa de marca — igual ao topo do site institucional */}
      <div className="relative overflow-hidden bg-deep px-8 py-6 flex items-center justify-between gap-4">
        <FileSpreadsheet className="absolute -right-6 -bottom-8 w-40 h-40 text-mint-300/10 rotate-[-8deg]" />
        <div className="relative flex items-center gap-4">
          <img src="/simbolo-cores.png" alt="" className="h-12 w-12 object-contain shrink-0" />
          <div>
            <div className="font-serif font-black text-2xl text-white leading-none">Plano A</div>
            <div className="font-sans font-medium text-[11px] tracking-[.24em] text-mint-300 uppercase mt-1.5">
              Contabilidade
            </div>
          </div>
        </div>
        <h1 className="relative font-serif font-black text-xl md:text-2xl text-white text-right leading-tight">
          Conferência
          <br />
          Fiscal
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
