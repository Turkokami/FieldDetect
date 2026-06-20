import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="border-b border-border px-5 py-3 flex gap-6">
          {["Invoice #", "Customer", "Date", "Amount", "Status", ""].map((h, i) => (
            <Skeleton key={i} className="h-3.5 w-20" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b border-border/50 px-5 py-3.5 flex items-center gap-6">
            <Skeleton className="h-4 w-24 font-mono" />
            <Skeleton className="h-4 w-36 flex-1" />
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
