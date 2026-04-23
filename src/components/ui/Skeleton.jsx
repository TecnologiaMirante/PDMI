import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/50", className)}
      {...props}
    />
  );
}

export function SkeletonCard({ className }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-0 overflow-hidden shadow-sm h-full flex flex-col", className)}>
      <Skeleton className="w-full aspect-video rounded-none" />
      <div className="p-4 space-y-3 flex-1">
        <div className="flex justify-between items-start gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-4 rounded-full" />
        </div>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="p-4 pt-0 mt-auto">
        <Skeleton className="h-9 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function SkeletonRow({ className }) {
  return (
    <div className={cn("flex items-center gap-3 p-3 rounded-xl border border-border bg-card/50", className)}>
      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-4 w-4 rounded-full shrink-0" />
    </div>
  );
}

export function SkeletonStatCard({ className }) {
  return (
    <div className={cn("flex items-center gap-3 bg-muted/30 border border-border p-3 rounded-xl", className)}>
      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-5 w-3/4" />
      </div>
    </div>
  );
}

export { Skeleton };
