import { listCompanies } from "@/lib/actions/companies";
import { CompaniesManager } from "@/components/company/CompaniesManager";
import { BrandLockup } from "@/components/layout/BrandLockup";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const companies = await listCompanies();

  return (
    <main className="min-h-full bg-paper">
      {/* Faixa de marca — igual ao topo do site institucional */}
      <div className="bg-deep px-8 py-7 flex items-center justify-between gap-4">
        <BrandLockup size="lg" />
        {/* Travessão em menta antes do título — o mesmo recurso do eyebrow da
            marca, que destaca sem precisar de ilustração de fundo. */}
        <div className="flex items-center gap-4">
          <span className="h-px w-12 bg-mint-300/70" />
          <h1 className="font-sans font-light text-2xl text-white/95 whitespace-nowrap tracking-[0.01em]">
            Validador de emissões
          </h1>
        </div>
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
