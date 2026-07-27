import { redirect } from "next/navigation";
import { listCompetencias } from "@/lib/actions/reconciliation";

export default async function ChecklistIndexPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const competencias = await listCompetencias(companyId);
  const current = competencias[0] ?? new Date().toISOString().slice(0, 7);
  redirect(`/c/${companyId}/checklist/${current}`);
}
