export function LoadingState({ label = 'Loading' }) {
  return (
    <div className="flex items-center gap-3 text-white/60" role="status" aria-live="polite">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-[#00D4FF]" />
      <span className="sr-only">{label}</span>
      <span>{label}</span>
    </div>
  )
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-2xl bg-white/6 ${className}`} />
}

export function DashboardSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
  )
}

export function PrizeSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-40" />
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 6 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12" />
      ))}
    </div>
  )
}

export function WheelSkeleton() {
  return <div className="mx-auto aspect-square w-[min(78vw,520px)] animate-pulse rounded-full bg-white/6" />
}

export function EmptyState({ title, body, action }) {
  return (
    <div className="glass-card rounded-[24px] px-6 py-14 text-center">
      <h3 className="font-heading text-xl text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-white/55">{body}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  )
}

export function ErrorState({ title, body, onRetry }) {
  return (
    <div className="rounded-[24px] border border-[#FF4757]/25 bg-[#FF4757]/8 px-6 py-10 text-center">
      <h3 className="font-heading text-xl text-white">{title}</h3>
      <p className="mt-2 text-white/60">{body}</p>
      {onRetry ? (
        <button className="mt-5 rounded-2xl bg-white/10 px-5 py-3 font-semibold" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  )
}
