"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DollarSign, FileText } from "lucide-react";

export function ConfigTabs({ basePath = "/config" }: { basePath?: string }) {
  const pathname = usePathname();

  const tabs = [
    { href: `${basePath}/platforms`, label: "Plataformas de Venda", icon: DollarSign },
    { href: `${basePath}/emitters`, label: "Emissores de Nota Fiscal", icon: FileText },
  ];

  return (
    <div className="flex items-center gap-2 border-b border-ink/8">
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              active ? "border-mint text-ink" : "border-transparent text-ink/45 hover:text-ink"
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </Link>
        );
      })}
    </div>
  );
}
