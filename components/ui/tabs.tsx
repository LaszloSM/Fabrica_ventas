'use client'

import { createContext, useContext, useState } from 'react'
import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/utils'

type TabsContextValue = {
  value: string
  setValue: (value: string) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)

export function Tabs({
  defaultValue,
  className,
  children,
}: {
  defaultValue: string
  className?: string
  children: ReactNode
}) {
  const [value, setValue] = useState(defaultValue)
  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('inline-flex gap-1 rounded-lg p-1', className)} {...props} />
}

export function TabsTrigger({
  value,
  className,
  children,
}: {
  value: string
  className?: string
  children: ReactNode
}) {
  const context = useContext(TabsContext)
  const active = context?.value === value

  return (
    <button
      type="button"
      className={cn(
        'rounded-md px-3 py-2 text-sm transition-colors',
        active ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
        className
      )}
      onClick={() => context?.setValue(value)}
    >
      {children}
    </button>
  )
}

export function TabsContent({
  value,
  className,
  children,
}: {
  value: string
  className?: string
  children: ReactNode
}) {
  const context = useContext(TabsContext)
  if (context?.value !== value) return null
  return <div className={className}>{children}</div>
}
