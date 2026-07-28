import Link from "next/link";
import { listCompanies } from "@/lib/actions/companies";
import { CreateCompanyForm } from "@/components/company/CreateCompanyForm";
import { Card } from "@/components/ui/Card";
import { SlidersHorizontal } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const companies = await listCompanies();

  return (
    <main className="min-h-full bg-paper">
      <div className="max-w-5xl mx-auto px-6 py-12 space-y-10">
        <header className="flex items-start justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-3 text-mint-700 text-xs font-semibold uppercase tracking-[.28em]">
              <span className="w-6 h-px bg-mint-500/70" /> Plano A
            </span>
            <h1 className="font-serif text-3xl font-black text-ink mt-3">Conferência Fiscal</h1>
            <p className="text-sm text-ink/60 mt-1">Selecione uma empresa ou adicione uma nova para começar.</p>
          </div>
          <Link
            href="/config/platforms"
            className="flex items-center gap-2 text-xs font-semibold text-ink/60 hover:text-mint bg-white border border-ink/10 px-4 py-2.5 rounded-input shrink-0 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" /> Mapeamentos Globais
          </Link>
        </header>

        <Card className="p-6">
          <h2 className="text-sm font-bold text-ink mb-4">Adicionar Empresa</h2>
          <CreateCompanyForm />
        </Card>

        <section className="space-y-3">
          <h2 className="text-sm font-bold text-ink/70 uppercase tracking-wide">Empresas cadastradas</h2>
          {companies.length === 0 ? (
            <p className="text-sm text-ink/50 italic">Nenhuma empresa cadastrada ainda.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {companies.map((company) => (
                <Link
                  key={company.id}
                  href={`/c/${company.id}/dashboard`}
                  className="block"
                >
                  <Card className="p-5 hover:shadow-card-hover transition-shadow">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-ink/40 font-bold uppercase tracking-wider">
                        Código {company.codigo}
                      </span>
                    </div>
                    <h3 className="font-serif font-black text-lg text-ink mt-1">{company.nome}</h3>
                    <span className="text-xs text-ink/50 block mt-1">{company.cnpj}</span>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
