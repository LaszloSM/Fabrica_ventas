'use client'

import { createContext, useContext, useState } from 'react'
import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/utils'

type SelectContextValue = {
  value?: string
  onValueChange?: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
}

const SelectContext = createContext<SelectContextValue | null>(null)

export function Select({
  value,
  onValueChange,
  children,
}: {
  value?: string
  onValueChange?: (value: string) => void
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  )
}

export function SelectTrigger({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLButtonElement>) {
  const context = useContext(SelectContext)

  return (
    <button
      type="button"
      className={cn('flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm', className)}
      onClick={() => context?.setOpen(!context.open)}
      {...props}
    >
      {children}
    </button>
  )
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const context = useContext(SelectContext)
  return <span>{context?.value || placeholder || 'Seleccionar'}</span>
}

export function SelectContent({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  const context = useContext(SelectContext)
  if (!context?.open) return null

  return (
    <div className={cn('absolute z-50 mt-2 w-full rounded-md border bg-popover p-1 shadow-lg', className)} {...props}>
      {children}
    </div>
  )
}

export function SelectItem({
  className,
  value,
  children,
}: {
  className?: string
  value: string
  children: ReactNode
}) {
  const context = useContext(SelectContext)

  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center rounded-sm px-3 py-2 text-left text-sm hover:bg-muted',
        context?.value === value && 'bg-muted',
        className
      )}
      onClick={() => {
        context?.onValueChange?.(value)
        context?.setOpen(false)
      }}
    >
      {children}
    </button>
  )
}
