import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/layout/Sidebar";
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

  return (
    <div className="flex h-full w-full overflow-hidden flex-1">
      <Sidebar
        companyId={company.id}
        companyName={company.nome}
        competencias={competencias}
        currentCompetencia={currentCompetencia}
      />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-paper">
        <div className="flex-1 overflow-y-auto p-8">{children}</div>
      </main>
    </div>
  );
}
