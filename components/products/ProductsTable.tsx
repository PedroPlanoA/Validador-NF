"use client";

import { Fragment, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Settings2, X } from "lucide-react";
import { upsertProductOverride, clearProductOverride, type ProductRow } from "@/lib/actions/products";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/validation/currency";

export function ProductsTable({
  companyId,
  plataforma,
  products,
  initialOpenProduto,
}: {
  companyId: string;
  plataforma: string;
  products: ProductRow[];
  initialOpenProduto?: string;
}) {
  const router = useRouter();
  const initialProduct = initialOpenProduto
    ? products.find((p) => p.produto === initialOpenProduto)
    : undefined;
  const [openProduto, setOpenProduto] = useState<string | null>(initialProduct ? initialProduct.produto : null);
  const [percentInput, setPercentInput] = useState(
    initialProduct
      ? initialProduct.overrideCommissionPercent != null
        ? String(initialProduct.overrideCommissionPercent)
        : String(Math.round(initialProduct.comissaoMediaAplicada * 100) / 100)
      : "",
  );
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (initialOpenProduto) {
      const el = document.getElementById(`product-${initialOpenProduto}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openEditor(product: ProductRow) {
    setOpenProduto(product.produto);
    setPercentInput(
      product.overrideCommissionPercent != null
        ? String(product.overrideCommissionPercent)
        : String(Math.round(product.comissaoMediaAplicada * 100) / 100),
    );
  }

  function save(produto: string) {
    const pct = Number(percentInput);
    if (Number.isNaN(pct) || pct < 0) return;
    startTransition(async () => {
      await upsertProductOverride(companyId, plataforma, produto, pct);
      setOpenProduto(null);
      router.refresh();
    });
  }

  function clear(produto: string) {
    startTransition(async () => {
      await clearProductOverride(companyId, plataforma, produto);
      setOpenProduto(null);
      router.refresh();
    });
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-paper-alt/40 border-b border-ink/8 text-ink/50 font-bold uppercase tracking-wider">
            <tr>
              <th className="py-3 px-5">Produto</th>
              <th className="py-3 px-5 text-right">Nº Vendas</th>
              <th className="py-3 px-5 text-right">Valor Médio</th>
              <th className="py-3 px-5">Comissão</th>
              <th className="py-3 px-5">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5 font-medium text-ink">
            {products.map((p) => (
              <Fragment key={p.produto}>
                <tr id={`product-${p.produto}`} className={openProduto === p.produto ? "bg-mint/5" : ""}>
                  <td className="py-3 px-5 max-w-xs truncate" title={p.produto}>
                    {p.produto}
                  </td>
                  <td className="py-3 px-5 text-right">{p.vendaCount}</td>
                  <td className="py-3 px-5 text-right">{formatCurrency(p.valorMedio, "BRL")}</td>
                  <td className="py-3 px-5">
                    {p.overrideCommissionPercent != null ? (
                      <Badge tone="info">Fixado: {p.overrideCommissionPercent}%</Badge>
                    ) : (
                      <span className="text-ink/50">
                        Padrão do mapeamento (méd. aplicada: {p.comissaoMediaAplicada.toFixed(1)}%)
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-5">
                    <button
                      onClick={() => (openProduto === p.produto ? setOpenProduto(null) : openEditor(p))}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-status-info hover:opacity-80"
                    >
                      <Settings2 className="w-3.5 h-3.5" /> Configurar
                    </button>
                  </td>
                </tr>
                {openProduto === p.produto && (
                  <tr className="bg-mint/5">
                    <td colSpan={5} className="px-5 pb-5 pt-1">
                      <div className="flex items-end gap-4 bg-white border border-ink/8 rounded-input p-4 max-w-lg">
                        <div className="space-y-1.5 flex-1">
                          <Label>Percentual de comissão/coprodução (%)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={percentInput}
                            onChange={(e) => setPercentInput(e.target.value)}
                            autoFocus
                          />
                          <p className="text-[11px] text-ink/40">
                            Este valor passa a valer para todas as vendas deste produto, sobrepondo o cálculo do
                            mapeamento — reanalise as importações para aplicar a mudança aos dados já importados.
                          </p>
                        </div>
                        <Button onClick={() => save(p.produto)} disabled={pending}>
                          Salvar
                        </Button>
                        {p.overrideCommissionPercent != null && (
                          <Button variant="ghost" onClick={() => clear(p.produto)} disabled={pending}>
                            Remover
                          </Button>
                        )}
                        <button
                          onClick={() => setOpenProduto(null)}
                          className="text-ink/40 hover:text-ink p-2.5"
                          title="Fechar"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-ink/40 italic">
                  Nenhum produto encontrado para esta plataforma.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
