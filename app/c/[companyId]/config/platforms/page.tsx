import Link from "next/link";
import { listPlatformConfigs } from "@/lib/actions/platformConfigs";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PlatformsConfigPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const configs = await listPlatformConfigs(companyId);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-ink">Mapeador Universal de Plataformas</h1>
          <p className="text-xs text-ink/50 mt-1">Configure mapeamentos dinâmicos para ler relatórios de vendas.</p>
        </div>
        <Link href={`/c/${companyId}/config/platforms/new`}>
          <Button>
            <Plus className="w-4 h-4" /> Novo Mapeamento
          </Button>
        </Link>
      </div>

      {configs.length === 0 ? (
        <p className="text-sm text-ink/40 italic">Nenhuma plataforma configurada ainda.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {configs.map((config) => (
            <Link key={config.id} href={`/c/${companyId}/config/platforms/${config.id}/edit`}>
              <Card className="p-5 hover:shadow-card-hover transition-shadow">
                <h3 className="font-serif font-black text-lg text-ink">{config.name}</h3>
                <p className="text-xs text-ink/50 mt-1">Comissão: {config.commType}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
