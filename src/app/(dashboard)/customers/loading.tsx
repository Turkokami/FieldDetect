import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-9 flex-1 max-w-sm rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="border-b border-border px-5 py-3 flex gap-6">
          {["Name", "Company", "Phone", "Properties", "Status"].map((h) => (
            <Skeleton key={h} className="h-3.5 w-20" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b border-border/50 px-5 py-3.5 flex items-center gap-6">
            <div className="flex items-center gap-3 flex-1">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
