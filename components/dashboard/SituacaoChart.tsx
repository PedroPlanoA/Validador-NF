"use client";

import { useRouter } from "next/navigation";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, type ChartEvent, type ActiveElement } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

/* Baseado na situação da própria nota fiscal (relatório de notas), não na
   reconciliação venda x nota — reflete todas as notas lidas, mesmo sem
   venda casada. */
const LABELS: Record<string, string> = {
  EMITIDO: "Emitido",
  CANCELADO: "Cancelado",
  ERRO_DE_EMISSAO: "Erro de Emissão",
  EM_EMISSAO: "Em Emissão",
  PENDENTE: "Pendente",
  OUTRO: "Outro",
};

/* Paleta da marca (plano-a-ux) — cada status recebe uma cor distinta da
   própria paleta oficial, não tons genéricos de biblioteca de gráficos. */
const COLORS: Record<string, string> = {
  EMITIDO: "#14B4A0", // mint / positive
  CANCELADO: "#B7B2A3", // neutro quente
  ERRO_DE_EMISSAO: "#C0453B", // danger
  EM_EMISSAO: "#007878", // teal / primary
  PENDENTE: "#D97D54", // clay / attention
  OUTRO: "#DCDCDC", // sand
};

export function SituacaoChart({ counts, companyId }: { counts: Record<string, number>; companyId: string }) {
  const router = useRouter();
  const entries = Object.entries(counts).filter(([, v]) => v > 0);
  if (entries.length === 0) {
    return <p className="text-xs text-ink/40 italic">Sem dados para este período.</p>;
  }

  function goToStatus(index: number) {
    const [key] = entries[index];
    const label = LABELS[key] ?? key;
    router.push(`/c/${companyId}/invoices?status=${encodeURIComponent(label)}`);
  }

  return (
    <Doughnut
      data={{
        labels: entries.map(([k]) => LABELS[k] ?? k),
        datasets: [
          {
            data: entries.map(([, v]) => v),
            backgroundColor: entries.map(([k]) => COLORS[k] ?? "#cbd5e1"),
            borderWidth: 0,
          },
        ],
      }}
      options={{
        plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10 } } } },
        maintainAspectRatio: false,
        onHover: (event, elements) => {
          const target = event.native?.target as HTMLElement | undefined;
          if (target) target.style.cursor = elements.length ? "pointer" : "default";
        },
        onClick: (_event: ChartEvent, elements: ActiveElement[]) => {
          if (elements.length > 0) goToStatus(elements[0].index);
        },
      }}
    />
  );
}
