import { Suspense } from "react";
import { BrandLockup } from "@/components/layout/BrandLockup";
import { LoginForm } from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="min-h-dvh bg-paper flex flex-col">
      <div className="bg-[linear-gradient(to_right,var(--color-deep),var(--color-deep-dark))] px-8 py-7">
        <BrandLockup size="lg" />
      </div>

      <div className="flex-1 flex items-start justify-center px-6 py-14">
        <div className="w-full max-w-sm space-y-6">
          {/* `useSearchParams` obriga a fronteira de Suspense — sem ela a página
              inteira viraria dinâmica no cliente e o build reclama. */}
          <Suspense fallback={<div className="h-80 bg-white/60 rounded-card animate-pulse" />}>
            <LoginForm />
          </Suspense>

          <p className="text-xs text-ink/45 text-center leading-relaxed">
            O acesso é restrito à equipe da Plano A. Se o seu e-mail não estiver liberado, fale com
            um administrador.
          </p>
        </div>
      </div>
    </main>
  );
}
