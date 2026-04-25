'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CheckSquare, FileText, GitBranch, Kanban, LayoutDashboard, Users, Zap } from 'lucide-react'

import { cn } from '@/lib/utils'

const items = [
  { href: '/dashboard', icon: LayoutDashboard },
  { href: '/pipeline', icon: Kanban },
  { href: '/prospects', icon: Users },
  { href: '/templates', icon: FileText },
  { href: '/sequences', icon: GitBranch },
  { href: '/activities', icon: CheckSquare },
  { href: '/triggers', icon: Zap },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-around border-t border-white/10 bg-[#0a0a0f]/90 backdrop-blur-xl p-2 text-white md:hidden">
      {items.map(({ href, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            'rounded-lg p-2 transition-colors relative',
            pathname === href ? 'text-[#f26522]' : 'text-white/40'
          )}
        >
          {pathname === href && (
            <div className="absolute inset-0 bg-[#f26522]/10 rounded-lg" />
          )}
          <Icon className="h-6 w-6 relative z-10" />
        </Link>
      ))}
    </nav>
  )
}
