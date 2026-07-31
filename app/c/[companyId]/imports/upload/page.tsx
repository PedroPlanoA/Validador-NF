import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listPlatformConfigs } from "@/lib/actions/platformConfigs";
import { listEmitterConfigs } from "@/lib/actions/emitterConfigs";
import { UploadForm } from "@/components/wizard/UploadForm";
import { PageTitle } from "@/components/ui/PageTitle";
import type { EmitterMappings, PlatformMappings } from "@/lib/mapping/types";

export default async function UploadPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const [platformConfigs, emitterConfigs] = await Promise.all([
    listPlatformConfigs(),
    listEmitterConfigs(),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href={`/c/${companyId}/imports`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/50 hover:text-mint-700 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Importações
        </Link>
        <PageTitle sub="Envie o relatório da plataforma de venda ou do emissor de nota fiscal.">
          Importar Relatório
        </PageTitle>
      </div>
      {/* Só os mapeamentos de coluna vão para o cliente — é o que ele precisa
          para extrair as colunas certas antes de enviar. Regras de comissão,
          status e limpeza de código continuam apenas no servidor. */}
      <UploadForm
        companyId={companyId}
        platformConfigs={platformConfigs.map((c) => ({
          id: c.id,
          name: c.name,
          mappings: c.mappings as unknown as PlatformMappings,
          currencyCol: c.currencyCol ?? undefined,
        }))}
        emitterConfigs={emitterConfigs.map((c) => ({
          id: c.id,
          name: c.name,
          mappings: c.mappings as unknown as EmitterMappings,
        }))}
      />
    </div>
  );
}
