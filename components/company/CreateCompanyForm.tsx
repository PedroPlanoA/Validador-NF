"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCompany, type CreateCompanyState } from "@/lib/actions/companies";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

const initialState: CreateCompanyState = {};

export function CreateCompanyForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const [state, formAction, pending] = useActionState(createCompany, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    // Only treat as "just succeeded" on the pending(true) -> pending(false)
    // transition — otherwise this would also fire on first mount, since
    // the empty initialState also has no error/fieldErrors.
    if (wasPending.current && !pending && !state.error && !state.fieldErrors) {
      formRef.current?.reset();
      onSuccess?.();
    }
    wasPending.current = pending;
  }, [pending, state, onSuccess]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Código</Label>
          <Input name="codigo" placeholder="ex: 001" required />
          {state.fieldErrors?.codigo && (
            <p className="text-xs text-danger">{state.fieldErrors.codigo}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Nome da empresa</Label>
          <Input name="nome" placeholder="ex: Cliente Exemplo LTDA" required />
          {state.fieldErrors?.nome && (
            <p className="text-xs text-danger">{state.fieldErrors.nome}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>CNPJ</Label>
          <Input name="cnpj" placeholder="00.000.000/0000-00" required />
          {state.fieldErrors?.cnpj && (
            <p className="text-xs text-danger">{state.fieldErrors.cnpj}</p>
          )}
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adicionando..." : "Adicionar Empresa"}
      </Button>
    </form>
  );
}
