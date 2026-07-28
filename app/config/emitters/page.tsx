import Link from "next/link";
import { listEmitterConfigs } from "@/lib/actions/emitterConfigs";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DeleteConfigButton } from "@/components/wizard/DeleteConfigButton";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EmittersConfigPage() {
  const configs = await listEmitterConfigs();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink/50 max-w-xl">
          Estes mapeamentos valem para todas as empresas — configure uma vez, use na importação de qualquer cliente.
        </p>
        <Link href="/config/emitters/new">
          <Button>
            <Plus className="w-4 h-4" /> Novo Mapeamento de Emissor
          </Button>
        </Link>
      </div>

      {configs.length === 0 ? (
        <p className="text-sm text-ink/40 italic">Nenhum emissor configurado ainda.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {configs.map((config) => (
            <Card key={config.id} className="p-5 hover:shadow-card-hover transition-shadow relative">
              <Link href={`/config/emitters/${config.id}/edit`} className="block pr-8">
                <h3 className="font-serif font-black text-lg text-ink">{config.name}</h3>
                <p className="text-xs text-ink/50 mt-1">Serviço padrão: {config.fallbackService || "—"}</p>
              </Link>
              <DeleteConfigButton kind="emitter" configId={config.id} configName={config.name} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
