"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X } from "lucide-react";
import { updateInvoiceFields } from "@/lib/actions/invoiceEdit";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";

/** Tipos oferecidos no seletor. Texto livre continua possível porque `tipo` é
 *  texto livre do emissor — o campo "Outro" cobre um emissor novo sem exigir
 *  mudança de código. */
const TIPOS_SUGERIDOS = ["NFS-e", "NF-e", "NF-e Devolução"];

export function EditInvoiceButton({
  invoiceId,
  numero,
  competencia,
  tipo,
}: {
  invoiceId: string;
  numero: string;
  competencia: string;
  tipo: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [form, setForm] = useState({ competencia, tipo });
  const outroTipo = !TIPOS_SUGERIDOS.includes(form.tipo);

  function abrir() {
    setForm({ competencia, tipo });
    setErro(null);
    setOpen(true);
  }

  function salvar() {
    startTransition(async () => {
      const res = await updateInvoiceFields(invoiceId, form);
      if (res.error) {
        setErro(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        title="Corrigir competência ou tipo desta nota"
        aria-label={`Corrigir nota ${numero}`}
        className="p-1.5 rounded-input text-ink/35 hover:text-teal hover:bg-teal/10 transition-colors"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-card-sm shadow-card-hover w-full max-w-sm p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-[15px] text-deep">Corrigir nota {numero}</h3>
              <button onClick={() => setOpen(false)} className="text-ink/40 hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <Label>Competência</Label>
              <Input
                type="month"
                fieldSize="sm"
                value={form.competencia}
                onChange={(e) => setForm((f) => ({ ...f, competencia: e.target.value }))}
                onClick={(e) => e.currentTarget.showPicker?.()}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Tipo da nota</Label>
              <Select
                fieldSize="sm"
                value={outroTipo ? "__outro" : form.tipo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tipo: e.target.value === "__outro" ? "" : e.target.value }))
                }
              >
                {TIPOS_SUGERIDOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
                <option value="__outro">Outro…</option>
              </Select>
              {outroTipo && (
                <Input
                  fieldSize="sm"
                  autoFocus
                  placeholder="Digite o tipo exatamente como deve aparecer"
                  value={form.tipo}
                  onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                />
              )}
            </div>

            <p className="text-[11px] text-ink/45">
              A correção é feita nesta linha e <strong>não sobrevive</strong> a uma reimportação ou reanálise do
              lote — nesses casos a nota volta ao que está no arquivo.
            </p>

            {erro && <p className="text-sm text-danger">{erro}</p>}

            <div className="flex justify-end gap-3 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button size="sm" onClick={salvar} disabled={pending}>
                {pending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
