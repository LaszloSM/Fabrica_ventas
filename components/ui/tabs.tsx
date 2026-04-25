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
  return (
    <div
      className={cn(
        'inline-flex gap-1 rounded-lg p-1 bg-white/[0.04] border border-white/[0.07]',
        className
      )}
      {...props}
    />
  )
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
        'rounded-md px-3 py-2 text-sm font-medium transition-all duration-150',
        active
          ? 'bg-[#f26522]/15 text-[#f26522] shadow-sm'
          : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]',
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
