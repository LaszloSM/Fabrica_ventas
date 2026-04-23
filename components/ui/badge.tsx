import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

export function Badge({
  className,
  variant = 'default',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: 'default' | 'secondary' | 'outline' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        variant === 'default' && 'border border-transparent bg-secondary text-secondary-foreground',
        variant === 'secondary' && 'border border-transparent bg-gray-100 text-gray-700',
        variant === 'outline' && 'border border-border bg-transparent text-foreground',
        className
      )}
      {...props}
    />
  )
}
