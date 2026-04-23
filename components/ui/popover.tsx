'use client'

import { cloneElement, isValidElement } from 'react'
import { createContext, useContext, useState } from 'react'
import type { HTMLAttributes, ReactElement, ReactNode } from 'react'

import { cn } from '@/lib/utils'

type PopoverContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
}

const PopoverContext = createContext<PopoverContextValue | null>(null)

export function Popover({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return <PopoverContext.Provider value={{ open, setOpen }}>{children}</PopoverContext.Provider>
}

export function PopoverTrigger({
  asChild,
  children,
}: {
  asChild?: boolean
  children: ReactElement
}) {
  const context = useContext(PopoverContext)
  if (!context) return children

  const { open, setOpen } = context
  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ onClick?: (event: unknown) => void }>
    return cloneElement(child, {
      onClick: (event: unknown) => {
        child.props.onClick?.(event)
        setOpen(!open)
      },
    })
  }
  return children
}

export function PopoverContent({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  const context = useContext(PopoverContext)
  if (!context?.open) return null

  return (
    <div className={cn('relative z-40 mt-2 rounded-lg border bg-popover p-4 shadow-lg', className)} {...props}>
      {children}
    </div>
  )
}
