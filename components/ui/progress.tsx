import { cn } from '@/lib/utils'

export function Progress({
  value = 0,
  className,
}: {
  value?: number
  className?: string
}) {
  const safeValue = Math.max(0, Math.min(100, value))

  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}>
      <div className="h-full rounded-full bg-green-600 transition-all" style={{ width: `${safeValue}%` }} />
    </div>
  )
}
