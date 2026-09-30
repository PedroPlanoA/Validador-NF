"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

/** Duas etapas na mesma tela: o e-mail e, depois, o código. */
type Etapa = "email" | "codigo";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const de = params.get("de");

  const [etapa, setEtapa] = useState<Etapa>("email");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function pedirCodigo(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const r = await fetch("/api/auth/codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.erro ?? "Não consegui enviar o código.");
      setEtapa("codigo");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha inesperada.");
    } finally {
      setEnviando(false);
    }
  }

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const r = await fetch("/api/auth/entrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, codigo }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.erro ?? "Código inválido.");
      // `refresh` antes de navegar: o layout é renderizado no servidor e
      // precisa ser refeito já com a sessão, senão a primeira tela vem sem ela.
      router.refresh();
      router.replace(de && de.startsWith("/") ? de : "/");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha inesperada.");
      setEnviando(false);
    }
  }

  return (
    <div className="bg-white rounded-card shadow-card border border-ink/5 p-8">
      {etapa === "email" ? (
        <form onSubmit={pedirCodigo} className="space-y-5">
          <div>
            <h2 className="font-serif font-black text-2xl text-deep">
              Entrar<span className="text-mint">.</span>
            </h2>
            <p className="text-sm text-text-2 mt-1.5">
              Informe o seu e-mail do escritório. Enviamos um código para ele.
            </p>
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-bold text-ink/60 mb-1.5">
              E-mail
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@planoacontabilidade.com.br"
            />
          </div>

          {erro && <p className="text-sm text-danger font-medium">{erro}</p>}

          <Button type="submit" disabled={enviando || !email} className="w-full justify-center">
            <Mail className="w-4 h-4" />
            {enviando ? "Enviando…" : "Enviar código"}
          </Button>
        </form>
      ) : (
        <form onSubmit={entrar} className="space-y-5">
          <div>
            <h2 className="font-serif font-black text-2xl text-deep">
              Código<span className="text-mint">.</span>
            </h2>
            <p className="text-sm text-text-2 mt-1.5">
              Enviamos um código de 6 dígitos para <strong className="text-ink">{email}</strong>. Ele
              vale por 10 minutos.
            </p>
          </div>

          <div>
            <label htmlFor="codigo" className="block text-xs font-bold text-ink/60 mb-1.5">
              Código recebido
            </label>
            <Input
              id="codigo"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              maxLength={6}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
              className="text-center text-2xl tracking-[.5em] font-bold"
              placeholder="000000"
            />
          </div>

          {erro && <p className="text-sm text-danger font-medium">{erro}</p>}

          <Button
            type="submit"
            disabled={enviando || codigo.length !== 6}
            className="w-full justify-center"
          >
            <ShieldCheck className="w-4 h-4" />
            {enviando ? "Entrando…" : "Entrar"}
          </Button>

          <button
            type="button"
            onClick={() => {
              setEtapa("email");
              setCodigo("");
              setErro(null);
            }}
            className="w-full text-sm text-ink/50 hover:text-deep font-medium inline-flex items-center justify-center gap-1.5"
          >
            Usar outro e-mail <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
    </div>
  );
}
