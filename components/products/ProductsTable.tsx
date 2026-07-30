"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Settings2, X, Search } from "lucide-react";
import { upsertProductOverride, clearProductOverride, type ProductRow } from "@/lib/actions/products";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { TABLE_CLASS, THEAD_CLASS, TBODY_CLASS, TR_CLASS } from "@/components/ui/Table";
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
  const [search, setSearch] = useState("");

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.produto.toLowerCase().includes(q));
  }, [products, search]);

  useEffect(() => {
    if (initialOpenProduto) {
      const el = document.getElementById(`product-${initialOpenProduto}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const editingProduct = openProduto ? products.find((p) => p.produto === openProduto) : undefined;

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
    <div className="space-y-4">
      {/* Busca em cartão próprio, como nas outras abas — ver o comentário em
          FilterBar sobre por que a barra saiu de dentro do card da tabela. */}
      <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[260px] max-w-sm">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-ink/30 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar produto..."
            className="w-full pl-11 pr-4 py-3 text-sm text-ink placeholder:text-ink/40 border border-ink/10 rounded-input outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint bg-white"
          />
        </div>
        <span className="text-xs text-ink/50 shrink-0 tabular-nums">
          {visibleProducts.length === 1 ? "1 produto" : `${visibleProducts.length} produtos`}
        </span>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
        <table className={`${TABLE_CLASS} whitespace-nowrap`}>
          <thead className={THEAD_CLASS}>
            <tr>
              <th className="py-3 px-5">Produto</th>
              <th className="py-3 px-5 text-right">Nº Vendas</th>
              <th className="py-3 px-5 text-right">Valor Médio</th>
              <th className="py-3 px-5">Comissão</th>
              <th className="py-3 px-5 w-10"></th>
            </tr>
          </thead>
          <tbody className={TBODY_CLASS}>
            {visibleProducts.map((p) => (
              <tr id={`product-${p.produto}`} key={p.produto} className={TR_CLASS}>
                <td className="py-3 px-5 max-w-xs truncate" title={p.produto}>
                  {p.produto}
                </td>
                <td className="py-3 px-5 text-right">{p.vendaCount}</td>
                <td className="py-3 px-5 text-right">{formatCurrency(p.valorMedio, "BRL")}</td>
                <td className="py-3 px-5">
                  {p.overrideCommissionPercent != null ? (
                    <Badge tone="primary">Fixado: {p.overrideCommissionPercent}%</Badge>
                  ) : (
                    <span className="text-ink/50">
                      Padrão do mapeamento (méd. aplicada: {p.comissaoMediaAplicada.toFixed(1)}%)
                    </span>
                  )}
                </td>
                <td className="py-3 px-5">
                  <button
                    onClick={() => openEditor(p)}
                    className="inline-flex items-center justify-center p-1.5 rounded-input text-ink/40 hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Configurar comissão"
                  >
                    <Settings2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {visibleProducts.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-ink/40 italic">
                  {products.length === 0
                    ? "Nenhum produto encontrado para esta plataforma."
                    : "Nenhum produto corresponde à pesquisa."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </Card>

      {editingProduct && (
        <div
          className="fixed inset-0 z-40 bg-ink/40 flex items-center justify-center p-4"
          onClick={() => setOpenProduto(null)}
        >
          <div
            className="bg-white rounded-card-sm shadow-card-hover w-full max-w-md p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-black text-lg text-deep truncate pr-4" title={editingProduct.produto}>
                {editingProduct.produto}
              </h3>
              <button onClick={() => setOpenProduto(null)} className="text-ink/40 hover:text-ink shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
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
                Este valor passa a valer para todas as vendas deste produto, sobrepondo o cálculo do mapeamento —
                reanalise as importações para aplicar a mudança aos dados já importados.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              {editingProduct.overrideCommissionPercent != null ? (
                <Button variant="ghost" onClick={() => clear(editingProduct.produto)} disabled={pending}>
                  Remover
                </Button>
              ) : (
                <span />
              )}
              <Button onClick={() => save(editingProduct.produto)} disabled={pending}>
                {pending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
