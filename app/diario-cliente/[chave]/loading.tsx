import { Skeleton } from "@/components/ui/Skeleton";

export default function Carregando() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <Skeleton className="h-40 w-full rounded-card" />
      <Skeleton className="h-64 w-full rounded-card-sm" />
    </div>
  );
}
