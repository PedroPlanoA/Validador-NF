import { listCompanies } from "@/lib/actions/companies";
import { CompaniesManager } from "@/components/company/CompaniesManager";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const companies = await listCompanies();

  return (
    <main className="min-h-full bg-paper">
      {/* Faixa de marca — igual ao topo do site institucional */}
      <div className="bg-deep px-8 py-6 flex items-center gap-4">
        <img src="/simbolo-cores.png" alt="" className="h-12 w-12 object-contain shrink-0" />
        <div>
          <div className="font-serif font-black text-2xl text-white leading-none">Plano A</div>
          <div className="font-sans font-medium text-[11px] tracking-[.24em] text-mint-300 uppercase mt-1.5">
            Contabilidade
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 space-y-8">
        <div>
          <h1 className="font-serif text-2xl font-black text-ink">Conferência Fiscal</h1>
          <p className="text-sm text-ink/60 mt-1">Selecione uma empresa para começar.</p>
        </div>

        <CompaniesManager companies={companies} />
      </div>
    </main>
  );
}
