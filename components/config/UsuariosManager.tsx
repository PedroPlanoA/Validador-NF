"use client";

import { useActionState } from "react";
import { ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { autorizarEmail, revogarEmail } from "@/lib/actions/usuarios";

interface Autorizado {
  email: string;
  nome: string | null;
  criadoPor: string;
}

export function UsuariosManager({
  masters,
  autorizados,
}: {
  masters: string[];
  autorizados: Autorizado[];
}) {
  const [estadoAdd, addAction, addPendente] = useActionState(autorizarEmail, null);
  const [estadoDel, delAction] = useActionState(revogarEmail, null);

  const recado = estadoAdd ?? estadoDel;

  return (
    <div className="space-y-6 max-w-3xl">
      <Card className="p-6">
        <h3 className="font-serif font-black text-lg text-deep">Liberar um e-mail</h3>
        <p className="text-sm text-text-2 mt-1">
          Quem estiver nesta lista entra no Hub com um código enviado por e-mail.
        </p>

        <form action={addAction} className="flex flex-wrap items-end gap-3 mt-5">
          <div className="flex-1 min-w-[240px]">
            <label htmlFor="email" className="block text-xs font-bold text-ink/60 mb-1.5">
              E-mail
            </label>
            <Input id="email" name="email" type="email" required placeholder="pessoa@planoacontabilidade.com.br" />
          </div>
          <div className="w-44">
            <label htmlFor="nome" className="block text-xs font-bold text-ink/60 mb-1.5">
              Nome (opcional)
            </label>
            <Input id="nome" name="nome" />
          </div>
          <Button type="submit" disabled={addPendente}>
            <UserPlus className="w-4 h-4" />
            {addPendente ? "Liberando…" : "Liberar"}
          </Button>
        </form>

        {recado?.erro && <p className="text-sm text-danger font-medium mt-3">{recado.erro}</p>}
        {recado?.ok && <p className="text-sm text-mint-700 font-medium mt-3">{recado.ok}</p>}
      </Card>

      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-ink/8 bg-paper-alt/40">
          <h4 className="text-sm font-bold text-ink">Administradores</h4>
        </div>
        <ul className="divide-y divide-ink/5">
          {masters.map((m) => (
            <li key={m} className="px-6 py-3.5 flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-mint-700 shrink-0" />
              <span className="text-sm text-ink font-medium">{m}</span>
              {/* Não há botão de remover: administrador sai do código, não da
                  tela — senão daria para um deles trancar os outros do lado de fora. */}
              <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-ink/35">
                Fixo no sistema
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-ink/8 bg-paper-alt/40 flex items-center justify-between">
          <h4 className="text-sm font-bold text-ink">E-mails liberados</h4>
          <span className="text-xs text-ink/45">{autorizados.length}</span>
        </div>

        {autorizados.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-ink/50">
            Ninguém liberado além dos administradores.
          </p>
        ) : (
          <ul className="divide-y divide-ink/5">
            {autorizados.map((u) => (
              <li key={u.email} className="px-6 py-3.5 flex items-center gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-ink font-medium truncate">{u.email}</p>
                  <p className="text-xs text-ink/45 mt-0.5">
                    {u.nome ? `${u.nome} · ` : ""}liberado por {u.criadoPor}
                  </p>
                </div>
                <form action={delAction} className="ml-auto">
                  <input type="hidden" name="email" value={u.email} />
                  <Button type="submit" variant="ghost" size="sm">
                    <Trash2 className="w-3.5 h-3.5" /> Remover
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
