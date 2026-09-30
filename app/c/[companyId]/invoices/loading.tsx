import { SkeletonCabecalho, SkeletonTabela } from "@/components/ui/Skeleton";

export default function Carregando() {
  return (
    <div className="space-y-8">
      <SkeletonCabecalho />
      <SkeletonTabela />
    </div>
  );
}
