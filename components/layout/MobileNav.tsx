'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CheckSquare, FileText, GitBranch, Kanban, LayoutDashboard, Users, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/pipeline',  icon: Kanban,          label: 'Pipeline'  },
  { href: '/prospects', icon: Users,            label: 'Prospectos'},
  { href: '/sequences', icon: GitBranch,        label: 'Secuencias'},
  { href: '/activities',icon: CheckSquare,      label: 'Actividades'},
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-around border-t border-white/[0.06] p-2 pb-safe text-white md:hidden"
      style={{ background: 'rgba(5,5,13,0.92)', backdropFilter: 'blur(20px)' }}
    >
      {items.map(({ href, icon: Icon, label }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all duration-150',
              active ? 'text-[#f26522]' : 'text-white/35 hover:text-white/60'
            )}
          >
            {active && (
              <div className="absolute bottom-full mb-0.5 w-8 h-0.5 rounded-full bg-[#f26522]" />
            )}
            <Icon className={cn('h-5 w-5', active && 'drop-shadow-[0_0_6px_rgba(242,101,34,0.6)]')} />
            <span className="text-[9px] font-medium leading-none">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
