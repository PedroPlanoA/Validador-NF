"use client";

import { useRouter } from "next/navigation";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, type ChartEvent, type ActiveElement } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

/* O tipo da nota (NF-e, NFS-e, NF-e Devolução...) é texto livre vindo do
   relatório do emissor — não há lista fechada, então a cor vem de uma paleta
   da marca aplicada na ordem de exibição (maior volume primeiro) em vez de um
   mapa fixo por nome. */
const PALETTE = [
  "#14B4A0", // mint / positive
  "#007878", // teal / primary
  "#D97D54", // clay / attention
  "#00323C", // deep
  "#B7B2A3", // neutro quente
  "#DCDCDC", // sand
];

/** Proporção de notas emitidas por tipo, em quantidade. Devoluções ficam fora
 *  desta visualização (ver `tiposSemDevolucao` no dashboard): elas não são
 *  faturamento, e incluí-las distorceria a leitura de "quanto de cada tipo a
 *  empresa emite". O volume completo, com devolução, está no gráfico de
 *  Emissões por Tipo. */
export function TipoProportionChart({
  data,
  companyId,
}: {
  data: { tipo: string; count: number }[];
  companyId: string;
}) {
  const router = useRouter();

  if (data.length === 0) {
    return <p className="text-xs text-ink/40 italic">Sem dados para este período.</p>;
  }

  return (
    <Doughnut
      data={{
        labels: data.map((d) => d.tipo),
        datasets: [
          {
            data: data.map((d) => d.count),
            backgroundColor: data.map((_, i) => PALETTE[i % PALETTE.length]),
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
          if (elements.length === 0) return;
          const { tipo } = data[elements[0].index];
          router.push(`/c/${companyId}/invoices?tipo=${encodeURIComponent(tipo)}`);
        },
      }}
    />
  );
}
