import { cn } from "@/lib/format"

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-sm bg-raised", className)} />
}

export function PageSkeleton() {
  return (
    <div className="h-full overflow-hidden" role="status" aria-label="Loading">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-7 w-48" />
        <Skeleton className="mt-3 h-3 w-72 max-w-full" />
        <div className="mt-8 space-y-4 border-t border-line pt-6">
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function RoomSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col" role="status" aria-label="Loading room">
      <div className="border-b border-line bg-ink px-4 py-3">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="min-h-0 flex-1 space-y-6 overflow-hidden px-4 py-6">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="flex gap-3">
            <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-3/4 max-w-xl" />
              {row % 2 === 0 ? <Skeleton className="h-3 w-1/2 max-w-md" /> : null}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-line p-4">
        <Skeleton className="h-20 w-full rounded-md" />
      </div>
    </div>
  )
}
