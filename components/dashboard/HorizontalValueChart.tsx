"use client";

import { useRouter } from "next/navigation";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  type Chart,
  type ChartEvent,
  type ActiveElement,
} from "chart.js";
import { formatCurrency } from "@/lib/validation/currency";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

export interface ValueBar {
  /** Rótulo do eixo (plataforma, tipo de nota...). */
  label: string;
  total: number;
  /** Destino ao clicar na barra. Sem href, a barra não é clicável. */
  href?: string;
}

/** Espaço reservado à direita para o valor escrito na ponta da barra. */
const LABEL_GUTTER = 92;

/** Escreve o valor na ponta de cada barra. Feito como plugin inline porque o
 *  projeto não usa chartjs-plugin-datalabels — são poucas linhas de canvas e
 *  evitam mais uma dependência só para isso. */
const valueLabelPlugin = {
  id: "valueLabel",
  afterDatasetsDraw(chart: Chart) {
    const { ctx } = chart;
    const values = chart.data.datasets[0].data as number[];
    ctx.save();
    ctx.font = "600 11px system-ui, sans-serif";
    ctx.fillStyle = "#4a4a4a";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    chart.getDatasetMeta(0).data.forEach((bar, i) => {
      ctx.fillText(formatCurrency(values[i], "BRL"), bar.x + 8, bar.y);
    });
    ctx.restore();
  },
};

/**
 * Barras horizontais com o valor escrito na ponta. Sem eixo de valores e sem
 * grade: com o número ao lado da barra, a régua e o quadriculado só poluíam a
 * leitura (pedido do usuário).
 */
export function HorizontalValueChart({ data, color = "#007878" }: { data: ValueBar[]; color?: string }) {
  const router = useRouter();

  if (data.length === 0) {
    return <p className="text-xs text-ink/40 italic">Sem dados para este período.</p>;
  }

  const clickable = data.some((d) => d.href);

  return (
    <Bar
      plugins={[valueLabelPlugin]}
      data={{
        labels: data.map((d) => d.label),
        datasets: [
          {
            data: data.map((d) => d.total),
            backgroundColor: color,
            borderRadius: 6,
            maxBarThickness: 34,
          },
        ],
      }}
      options={{
        indexAxis: "y",
        maintainAspectRatio: false,
        layout: { padding: { right: LABEL_GUTTER } },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => formatCurrency(item.parsed.x ?? 0, "BRL"),
            },
          },
        },
        scales: {
          x: { display: false, beginAtZero: true },
          y: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 11 } } },
        },
        onHover: (event, elements) => {
          const target = event.native?.target as HTMLElement | undefined;
          if (target) target.style.cursor = clickable && elements.length ? "pointer" : "default";
        },
        onClick: (_event: ChartEvent, elements: ActiveElement[]) => {
          if (elements.length === 0) return;
          const { href } = data[elements[0].index];
          if (href) router.push(href);
        },
      }}
    />
  );
}
