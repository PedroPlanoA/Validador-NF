import { SkeletonCabecalho, SkeletonKpis, SkeletonTabela } from "@/components/ui/Skeleton";

/** O dashboard é a tela mais pesada (reconciliação inteira), então é a que mais
 *  precisa mostrar que está trabalhando. */
export default function Carregando() {
  return (
    <div className="space-y-8">
      <SkeletonCabecalho />
      <SkeletonKpis />
      <SkeletonKpis quantos={3} />
      <SkeletonTabela linhas={5} />
    </div>
  );
}
