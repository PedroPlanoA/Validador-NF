import { SkeletonCabecalho, SkeletonTabela } from "@/components/ui/Skeleton";

/** Vale para qualquer aba da empresa que não tenha um esqueleto mais específico. */
export default function Carregando() {
  return (
    <div className="space-y-8">
      <SkeletonCabecalho />
      <SkeletonTabela />
    </div>
  );
}
