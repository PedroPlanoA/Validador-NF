"use server";

import { db } from "@/lib/db";
import { companySchema } from "@/lib/validation/schemas";
import { revalidatePath } from "next/cache";

export interface CreateCompanyState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

/** Valida os três campos do cadastro e checa a unicidade do código, ignorando a
 *  própria empresa quando é edição (senão editar só o nome acusaria "código já
 *  existe" contra o próprio registro). */
async function validateCompanyForm(
  formData: FormData,
  ignoreCompanyId?: string,
): Promise<{ data: { codigo: string; nome: string; cnpj: string } } | { state: CreateCompanyState }> {
  const parsed = companySchema.safeParse({
    codigo: formData.get("codigo"),
    nome: formData.get("nome"),
    cnpj: formData.get("cnpj"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { state: { fieldErrors } };
  }

  const existing = await db.company.findUnique({ where: { codigo: parsed.data.codigo } });
  if (existing && existing.id !== ignoreCompanyId) {
    return { state: { fieldErrors: { codigo: "Já existe uma empresa com este código" } } };
  }

  return { data: parsed.data };
}

export async function createCompany(
  _prevState: CreateCompanyState,
  formData: FormData,
): Promise<CreateCompanyState> {
  const result = await validateCompanyForm(formData);
  if ("state" in result) return result.state;

  await db.company.create({ data: result.data });
  revalidatePath("/companies");
  return {};
}

/**
 * Edita código, nome e CNPJ de uma empresa já cadastrada. Nada mais é tocado:
 * vendas, notas, importações e checklists continuam vinculados pelo id, então
 * corrigir um código digitado errado não afeta nenhum dado importado.
 */
export async function updateCompany(
  companyId: string,
  _prevState: CreateCompanyState,
  formData: FormData,
): Promise<CreateCompanyState> {
  const result = await validateCompanyForm(formData, companyId);
  if ("state" in result) return result.state;

  await db.company.update({ where: { id: companyId }, data: result.data });
  revalidatePath("/companies");
  // A faixa lateral de dentro da empresa mostra código, nome e CNPJ — sem isto
  // ela continuaria exibindo o cadastro antigo.
  revalidatePath(`/c/${companyId}`, "layout");
  return {};
}

/** Ordered by código, ascending and numeric-aware — "10" vem depois de "2", que
 *  a ordenação de texto do banco inverteria. Códigos não numéricos caem no
 *  compare de string e vão para o fim da lista. */
export async function listCompanies() {
  const companies = await db.company.findMany();
  return companies.sort((a, b) => {
    const na = Number(a.codigo);
    const nb = Number(b.codigo);
    const aIsNum = !Number.isNaN(na);
    const bIsNum = !Number.isNaN(nb);
    if (aIsNum && bIsNum) return na - nb;
    if (aIsNum !== bIsNum) return aIsNum ? -1 : 1;
    return a.codigo.localeCompare(b.codigo);
  });
}

/**
 * Deletes a company and, via cascade, every Sale/Invoice/ImportBatch/
 * ChecklistState row scoped to it. Mapping configs (platform/emitter) are
 * global and are never affected by deleting a company.
 */
export async function deleteCompany(companyId: string) {
  await db.company.delete({ where: { id: companyId } });
  revalidatePath("/companies");
}

/** Bulk variant for the multi-select delete flow on the companies screen. */
export async function deleteCompanies(companyIds: string[]) {
  await db.company.deleteMany({ where: { id: { in: companyIds } } });
  revalidatePath("/companies");
}
