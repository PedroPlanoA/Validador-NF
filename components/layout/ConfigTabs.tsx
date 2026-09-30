"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DollarSign, FileText, Users } from "lucide-react";

export function ConfigTabs({
  basePath = "/config",
  mostrarUsuarios = false,
}: {
  basePath?: string;
  /** Só administradores veem a aba — ver `lib/auth/autorizados.ts`. Esconder é
   *  cosmético: quem chamar a ação direto é barrado nela mesma. */
  mostrarUsuarios?: boolean;
}) {
  const pathname = usePathname();

  const tabs = [
    { href: `${basePath}/platforms`, label: "Plataformas de Venda", icon: DollarSign },
    { href: `${basePath}/emitters`, label: "Emissores de Nota Fiscal", icon: FileText },
    // Usuários é global, não por empresa: mora só em /config.
    ...(mostrarUsuarios && basePath === "/config"
      ? [{ href: `${basePath}/usuarios`, label: "Usuários", icon: Users }]
      : []),
  ];

  return (
    <div className="flex items-center gap-2 border-b border-ink/8">
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors ${
              active ? "border-mint text-deep" : "border-transparent text-ink/45 hover:text-ink"
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </Link>
        );
      })}
    </div>
  );
}
