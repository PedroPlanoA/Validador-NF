"use client";

import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip } from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

export function PlatformChart({ data }: { data: { plataforma: string; total: number }[] }) {
  if (data.length === 0) {
    return <p className="text-xs text-ink/40 italic">Sem dados para este período.</p>;
  }

  return (
    <Bar
      data={{
        labels: data.map((d) => d.plataforma),
        datasets: [
          {
            data: data.map((d) => d.total),
            backgroundColor: "#6366f1",
            borderRadius: 6,
            maxBarThickness: 36,
          },
        ],
      }}
      options={{
        indexAxis: "y",
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true } },
        maintainAspectRatio: false,
      }}
    />
  );
}
