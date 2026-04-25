'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/icons/Logo'
import {
  LayoutDashboard, Kanban, Users, FileText, GitBranch,
  CheckSquare, Zap, Settings, ChevronLeft, ChevronRight,
  Flame
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/pipeline',    label: 'Pipeline',     icon: Kanban },
  { href: '/prospects',   label: 'Prospectos',   icon: Users },
  { href: '/templates',   label: 'Plantillas',   icon: FileText },
  { href: '/sequences',   label: 'Secuencias',   icon: GitBranch },
  { href: '/activities',  label: 'Actividades',  icon: CheckSquare },
  { href: '/triggers',    label: 'Señales',      icon: Zap },
  { href: '/settings',    label: 'Configuración', icon: Settings },
]

interface DealSummary {
  total: number
  hot: number
}

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [summary, setSummary] = useState<DealSummary | null>(null)

  useEffect(() => {
    fetch('/api/deals')
      .then((r) => r.json())
      .then((j) => {
        const deals = j.data || []
        const hot = deals.filter((d: any) =>
          ['PROPUESTA_ENVIADA', 'NEGOCIACION', 'GANADO'].includes(d.stage)
        ).length
        setSummary({ total: deals.length, hot })
      })
      .catch(() => {
        // silently fail
      })
  }, [])

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col min-h-screen border-r border-white/5 text-white transition-all duration-300',
        'bg-[#0a0a0f]/80 backdrop-blur-xl',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo area */}
      <div className="h-16 flex items-center justify-center border-b border-white/10 px-4">
        {collapsed ? (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#f26522] to-[#d5551a] flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-orange-500/30">
            C
          </div>
        ) : (
          <Logo className="h-6 w-auto text-white" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative overflow-hidden',
                active
                  ? 'text-white'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              )}
            >
              {active && (
                <div className="absolute inset-0 bg-gradient-to-r from-[#f26522]/20 to-transparent rounded-xl" />
              )}
              <Icon className={cn('w-5 h-5 flex-shrink-0 relative z-10', active && 'text-[#f26522]')} />
              {!collapsed && <span className="truncate relative z-10">{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Pipeline status indicator */}
      {!collapsed && summary && (
        <div className="mx-3 mb-3 p-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-4 h-4 text-[#f26522]" />
            <span className="text-xs font-medium text-white/90">Pipeline</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-white">{summary.total}</span>
            <span className="text-xs text-white/60">deals</span>
          </div>
          <div className="mt-1.5 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#f26522] to-[#d5551a] rounded-full transition-all"
              style={{
                width: summary.total > 0 ? `${(summary.hot / summary.total) * 100}%` : '0%',
              }}
            />
          </div>
          <p className="text-[10px] text-white/50 mt-1">
            {summary.hot} en etapas calientes
          </p>
        </div>
      )}

      {/* Collapse toggle */}
      <div className="p-2 border-t border-white/10">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          title={collapsed ? 'Expandir' : 'Colapsar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span className="text-xs">Colapsar</span>}
        </button>
      </div>
    </aside>
  )
}
