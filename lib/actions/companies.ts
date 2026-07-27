"use server";

import { db } from "@/lib/db";
import { companySchema } from "@/lib/validation/schemas";
import { revalidatePath } from "next/cache";

export interface CreateCompanyState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function createCompany(
  _prevState: CreateCompanyState,
  formData: FormData,
): Promise<CreateCompanyState> {
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
    return { fieldErrors };
  }

  const existing = await db.company.findUnique({ where: { codigo: parsed.data.codigo } });
  if (existing) {
    return { fieldErrors: { codigo: "Já existe uma empresa com este código" } };
  }

  await db.company.create({ data: parsed.data });
  revalidatePath("/companies");
  return {};
}

export async function listCompanies() {
  return db.company.findMany({ orderBy: { createdAt: "desc" } });
}
