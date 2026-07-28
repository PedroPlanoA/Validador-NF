"use server";

import { cookies } from "next/headers";

/**
 * A single competência selection, scoped per company and persisted in a
 * cookie — so every page/function under that company (dashboard, vendas,
 * checklist, erros...) reads the exact same value instead of each screen
 * keeping its own filter and risking them drifting apart.
 */
function cookieName(companyId: string) {
  return `competencia_${companyId}`;
}

export async function setCompetenciaCookie(companyId: string, value: string) {
  const store = await cookies();
  if (!value || value === "all") {
    store.delete(cookieName(companyId));
  } else {
    store.set(cookieName(companyId), value, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
}

export async function getCompetenciaCookie(companyId: string): Promise<string | undefined> {
  const store = await cookies();
  return store.get(cookieName(companyId))?.value;
}
