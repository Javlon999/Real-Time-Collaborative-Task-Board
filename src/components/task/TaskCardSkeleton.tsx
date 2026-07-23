import { cn } from '@/lib/utils'

/**
 * Skeleton loading placeholder for a TaskCard.
 * Shown while an API call is in-flight.
 * Uses CSS animation — no JavaScript, no Framer Motion.
 */
export function TaskCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-3 space-y-2 animate-pulse',
        className
      )}
      aria-label="Loading task…"
      role="status"
    >
      {/* Title line */}
      <div className="h-4 bg-muted rounded w-3/4" />
      {/* Description lines */}
      <div className="h-3 bg-muted rounded w-full" />
      <div className="h-3 bg-muted rounded w-5/6" />
      {/* Footer row */}
      <div className="flex items-center justify-between pt-1">
        <div className="h-5 bg-muted rounded-full w-16" />
        <div className="h-4 bg-muted rounded w-20" />
      </div>
    </div>
  )
}
