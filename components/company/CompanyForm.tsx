"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCompany, updateCompany, type CreateCompanyState } from "@/lib/actions/companies";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

const initialState: CreateCompanyState = {};

export interface CompanyFormValues {
  id: string;
  codigo: string;
  nome: string;
  cnpj: string;
}

/**
 * Cadastro e edição de empresa no mesmo formulário — os campos e as validações
 * são idênticos, só muda a ação e o rótulo do botão. Passar `company` liga o
 * modo de edição.
 */
export function CompanyForm({
  company,
  onSuccess,
}: {
  company?: CompanyFormValues;
  onSuccess?: () => void;
}) {
  const action = company
    ? updateCompany.bind(null, company.id)
    : (createCompany as (state: CreateCompanyState, formData: FormData) => Promise<CreateCompanyState>);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    // Only treat as "just succeeded" on the pending(true) -> pending(false)
    // transition — otherwise this would also fire on first mount, since
    // the empty initialState also has no error/fieldErrors.
    if (wasPending.current && !pending && !state.error && !state.fieldErrors) {
      if (!company) formRef.current?.reset();
      onSuccess?.();
    }
    wasPending.current = pending;
  }, [pending, state, onSuccess, company]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Código</Label>
          <Input name="codigo" placeholder="ex: 001" defaultValue={company?.codigo} required />
          {state.fieldErrors?.codigo && <p className="text-xs text-danger">{state.fieldErrors.codigo}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Nome da empresa</Label>
          <Input
            name="nome"
            placeholder="ex: Cliente Exemplo LTDA"
            defaultValue={company?.nome}
            required
          />
          {state.fieldErrors?.nome && <p className="text-xs text-danger">{state.fieldErrors.nome}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>CNPJ</Label>
          <Input name="cnpj" placeholder="00.000.000/0000-00" defaultValue={company?.cnpj} required />
          {state.fieldErrors?.cnpj && <p className="text-xs text-danger">{state.fieldErrors.cnpj}</p>}
        </div>
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {company
          ? pending
            ? "Salvando..."
            : "Salvar alterações"
          : pending
            ? "Adicionando..."
            : "Adicionar Empresa"}
      </Button>
    </form>
  );
}
