import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/layout/Sidebar";
import { CompanyFab } from "@/components/layout/CompanyFab";
import { listCompetencias } from "@/lib/actions/reconciliation";
import { getCompetenciaCookie } from "@/lib/actions/competenciaCookie";

export default async function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company) notFound();

  const [competencias, currentCompetencia] = await Promise.all([
    listCompetencias(companyId),
    getCompetenciaCookie(companyId),
  ]);

  // A faixa lateral é `fixed` (ver Sidebar) — a página inteira rola
  // normalmente, e é só o conteúdo que se move. O `ml-64` reserva a coluna que
  // a faixa ocupa; sem isso o conteúdo passaria por baixo dela.
  return (
    <div className="min-h-full">
      <Sidebar
        companyId={company.id}
        companyName={company.nome}
        companyCodigo={company.codigo}
        companyCnpj={company.cnpj}
        competencias={competencias}
        currentCompetencia={currentCompetencia}
      />
      <main className="ml-64 min-h-dvh bg-paper">
        <div className="p-8 pb-24">{children}</div>
      </main>
      <CompanyFab companyId={company.id} />
    </div>
  );
}
