"use client";

import { useRouter } from "next/navigation";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, type ChartEvent, type ActiveElement } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

const LABELS: Record<string, string> = {
  NF_EMITIDA: "NF Emitida",
  NF_NAO_EMITIDA: "NF Não Emitida",
  ERRO_DE_EMISSAO: "Erro de Emissão",
  ERRO_DE_CANCELAMENTO: "Erro Cancelamento",
  NF_CANCELADA: "NF Cancelada",
  MULTIPLAS_NOTAS_REVISAO: "Múltiplas Notas",
  OUTRO: "Outro",
};

/* Paleta da marca (plano-a-ux) — cada status recebe uma cor distinta da
   própria paleta oficial, não tons genéricos de biblioteca de gráficos. */
const COLORS: Record<string, string> = {
  NF_EMITIDA: "#14B4A0", // mint / positive
  NF_NAO_EMITIDA: "#D97D54", // clay / attention
  ERRO_DE_EMISSAO: "#C0453B", // danger
  ERRO_DE_CANCELAMENTO: "#00323C", // deep
  NF_CANCELADA: "#B7B2A3", // neutro quente
  MULTIPLAS_NOTAS_REVISAO: "#007878", // teal / primary
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
    router.push(`/c/${companyId}/sales?status=${encodeURIComponent(label)}`);
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
