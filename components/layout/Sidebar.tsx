'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Kanban, Users, FileText, GitBranch,
  CheckSquare, Zap, Settings, LogOut
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/pipeline',    label: 'Pipeline',     icon: Kanban },
  { href: '/prospects',   label: 'Prospectos',   icon: Users },
  { href: '/templates',   label: 'Plantillas',   icon: FileText },
  { href: '/sequences',   label: 'Secuencias',   icon: GitBranch },
  { href: '/activities',  label: 'Actividades',  icon: CheckSquare },
  { href: '/triggers',    label: 'Señales',      icon: Zap },
]

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-white flex flex-col hidden md:flex">
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-sm font-bold">C</div>
          <div>
            <p className="font-semibold text-sm">CoimpactoB</p>
            <p className="text-xs text-gray-400">Fábrica de Ventas</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith(href)
                ? 'bg-green-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
