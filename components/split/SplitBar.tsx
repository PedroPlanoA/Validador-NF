import { formatPercent } from "@/lib/format/percent";

/**
 * Barra empilhada NF-e × NFS-e. O rótulo só entra no segmento quando ele tem
 * largura para caber — abaixo disso a porcentagem fica ilegível e o valor já
 * está na tabela ao lado.
 */
export function SplitBar({ nfe, nfse, height = "h-9" }: { nfe: number; nfse: number; height?: string }) {
  const total = nfe + nfse;
  if (total <= 0) return null;

  const pNfe = nfe / total;
  const pNfse = 1 - pNfe;

  return (
    <div className={`flex w-full ${height} overflow-hidden rounded-input`}>
      {pNfe > 0 && (
        <div
          className="flex items-center justify-center bg-clay text-white text-xs font-bold"
          style={{ width: `${pNfe * 100}%` }}
          title={`NF-e ${formatPercent(pNfe)}`}
        >
          {pNfe > 0.1 && `NF-e ${formatPercent(pNfe)}`}
        </div>
      )}
      {pNfse > 0 && (
        <div
          className="flex items-center justify-center bg-teal text-white text-xs font-bold"
          style={{ width: `${pNfse * 100}%` }}
          title={`NFS-e ${formatPercent(pNfse)}`}
        >
          {pNfse > 0.1 && `NFS-e ${formatPercent(pNfse)}`}
        </div>
      )}
    </div>
  );
}
