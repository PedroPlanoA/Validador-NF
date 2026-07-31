import { db } from "@/lib/db";

export interface UnmappedStatus {
  sourceType: "PLATFORM" | "EMITTER";
  configId: string;
  configName: string;
  /** Texto exato como veio no relatório — é o que precisa ser colado no mapeamento. */
  valor: string;
  quantidade: number;
}

/**
 * Valores de situação que os relatórios trazem e que **nenhuma chave do
 * mapeamento cobre** — cada um deles virou "Outro" na análise.
 *
 * Existe porque a comparação do status é exata, caractere por caractere: uma
 * letra em outra caixa, um acento ou um espaço a mais já fazem o valor não
 * casar. Antes isso era silencioso (a nota simplesmente aparecia como "Outro"),
 * e só dava para descobrir olhando linha por linha.
 *
 * A detecção é por comparação com as chaves do mapeamento, e não por "resultou
 * em Outro": um valor mapeado de propósito para Outro está correto e não deve
 * ser reportado.
 *
 * Linhas importadas antes de `situacaoNfOriginal` existir têm o texto vazio e
 * ficam de fora — reanalisar o lote preenche o campo e elas passam a aparecer.
 */
export async function listUnmappedStatuses(companyId: string): Promise<UnmappedStatus[]> {
  const [invoiceGroups, saleGroups, emitterConfigs, platformConfigs] = await Promise.all([
    db.invoice.groupBy({
      by: ["emitterConfigId", "situacaoNfOriginal"],
      where: { companyId, situacaoNf: "OUTRO", situacaoNfOriginal: { not: "" } },
      _count: { _all: true },
    }),
    db.sale.groupBy({
      by: ["platformConfigId", "situacaoVendaOriginal"],
      where: { companyId, situacaoVenda: "OUTRO", situacaoVendaOriginal: { not: "" } },
      _count: { _all: true },
    }),
    db.emitterConfig.findMany({ select: { id: true, name: true, statusMap: true } }),
    db.platformConfig.findMany({ select: { id: true, name: true, statusMap: true } }),
  ]);

  const keysOf = (statusMap: unknown) => new Set(Object.keys((statusMap ?? {}) as Record<string, string>));
  const emitters = new Map(emitterConfigs.map((c) => [c.id, { name: c.name, keys: keysOf(c.statusMap) }]));
  const platforms = new Map(platformConfigs.map((c) => [c.id, { name: c.name, keys: keysOf(c.statusMap) }]));

  const result: UnmappedStatus[] = [];

  for (const g of invoiceGroups) {
    const config = emitters.get(g.emitterConfigId);
    if (!config || config.keys.has(g.situacaoNfOriginal)) continue;
    result.push({
      sourceType: "EMITTER",
      configId: g.emitterConfigId,
      configName: config.name,
      valor: g.situacaoNfOriginal,
      quantidade: g._count._all,
    });
  }

  for (const g of saleGroups) {
    const config = platforms.get(g.platformConfigId);
    if (!config || config.keys.has(g.situacaoVendaOriginal)) continue;
    result.push({
      sourceType: "PLATFORM",
      configId: g.platformConfigId,
      configName: config.name,
      valor: g.situacaoVendaOriginal,
      quantidade: g._count._all,
    });
  }

  return result.sort((a, b) => b.quantidade - a.quantidade);
}
