import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DataSkeletonProps {
  label: string;
  variant?: "cards" | "list" | "rows";
  count?: number;
  className?: string;
}

export function DataSkeleton({ label, variant = "list", count = 3, className }: DataSkeletonProps) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className={cn(
        variant === "cards" ? "grid sm:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-3",
        variant === "rows" && "p-5",
      )}>
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className={cn(
            "rounded-xl border border-slate-100 bg-white p-4 sm:p-5",
            variant === "rows" && "rounded-none border-x-0 border-t-0",
          )}>
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-3/5 max-w-48" />
                <Skeleton className="h-3 w-2/5 max-w-32" />
              </div>
              {variant !== "cards" && <Skeleton className="h-6 w-16 rounded-full" />}
            </div>
            {variant === "cards" && (
              <div className="mt-5 space-y-3">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-16 w-full rounded-xl" />
                <div className="flex justify-between border-t border-slate-100 pt-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            )}
            {variant === "rows" && (
              <div className="mt-3 grid grid-cols-3 gap-4 sm:grid-cols-5">
                {Array.from({ length: 5 }, (_, cell) => <Skeleton key={cell} className={cn("h-3 w-full", cell > 2 && "hidden sm:block")} />)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
