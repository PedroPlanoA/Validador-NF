import { Skeleton } from "@/components/ui/Skeleton";

export default function Carregando() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      <Skeleton className="h-9 w-56" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="bg-white rounded-card-sm border border-ink/5 shadow-card p-6 space-y-3">
            <Skeleton className="h-5 w-20 rounded-pill" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-3 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}
