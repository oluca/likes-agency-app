import { Skeleton } from "@/components/ui/skeleton";
import { cardClass } from "@/lib/ui";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Lade Inhalt">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={`${cardClass} p-5`}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-4 h-8 w-14" />
          </div>
        ))}
      </div>
      <div className={`${cardClass} p-6`}>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-6 h-40 w-full" />
      </div>
    </div>
  );
}
