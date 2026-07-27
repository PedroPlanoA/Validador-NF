"use client";

import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

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

const COLORS: Record<string, string> = {
  NF_EMITIDA: "#10b981",
  NF_NAO_EMITIDA: "#f43f5e",
  ERRO_DE_EMISSAO: "#f59e0b",
  ERRO_DE_CANCELAMENTO: "#a855f7",
  NF_CANCELADA: "#94a3b8",
  MULTIPLAS_NOTAS_REVISAO: "#d97d54",
  OUTRO: "#cbd5e1",
};

export function SituacaoChart({ counts }: { counts: Record<string, number> }) {
  const entries = Object.entries(counts).filter(([, v]) => v > 0);
  if (entries.length === 0) {
    return <p className="text-xs text-ink/40 italic">Sem dados para este período.</p>;
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
      }}
    />
  );
}
