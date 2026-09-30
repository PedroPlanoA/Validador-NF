import { Skeleton } from "@/components/ui/Skeleton";

export default function Carregando() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-12 w-full rounded-input" />
      <div className="space-y-2.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-card-sm" />
        ))}
      </div>
    </div>
  );
}
