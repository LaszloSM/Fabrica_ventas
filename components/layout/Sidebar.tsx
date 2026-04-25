'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Kanban, Users, FileText, GitBranch,
  CheckSquare, Zap, Settings, ChevronLeft, ChevronRight,
  TrendingUp,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard',   label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/pipeline',    label: 'Pipeline',        icon: Kanban },
  { href: '/prospects',   label: 'Prospectos',      icon: Users },
  { href: '/templates',   label: 'Plantillas',      icon: FileText },
  { href: '/sequences',   label: 'Secuencias',      icon: GitBranch },
  { href: '/activities',  label: 'Actividades',     icon: CheckSquare },
  { href: '/triggers',    label: 'Señales',         icon: Zap },
]

const BOTTOM_ITEMS = [
  { href: '/settings', label: 'Configuración', icon: Settings },
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
      .catch(() => {})
  }, [])

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col min-h-screen transition-all duration-300 ease-in-out relative flex-shrink-0',
        'border-r border-white/[0.06]',
        collapsed ? 'w-[68px]' : 'w-[232px]'
      )}
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.015) 100%)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center border-b border-white/[0.06] h-[60px] flex-shrink-0',
        collapsed ? 'justify-center px-0' : 'px-5 gap-3'
      )}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#f26522] to-[#c44e18] flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-orange-600/20 flex-shrink-0">
          C
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-white leading-tight truncate">CoimpactoB</p>
            <p className="text-[10px] text-white/35 leading-tight">Fábrica de Ventas</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl text-[13px] font-medium transition-all duration-150',
                collapsed ? 'h-10 w-10 mx-auto justify-center' : 'h-9 px-3',
                active
                  ? 'bg-[rgba(242,101,34,0.12)] text-white'
                  : 'text-white/45 hover:text-white/80 hover:bg-white/[0.04]'
              )}
            >
              {/* Active left indicator */}
              {active && !collapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#f26522] rounded-r-full" />
              )}
              <Icon className={cn(
                'flex-shrink-0 transition-colors',
                collapsed ? 'w-[18px] h-[18px]' : 'w-4 h-4',
                active ? 'text-[#f26522]' : 'text-current'
              )} />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Pipeline summary */}
      {!collapsed && summary && summary.total > 0 && (
        <div className="mx-3 mb-3 p-3 rounded-xl border border-white/[0.07] bg-white/[0.025]">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#f26522]" />
              <span className="text-[11px] font-semibold text-white/70">Pipeline activo</span>
            </div>
            <span className="text-[11px] font-bold text-white">{summary.total}</span>
          </div>
          <div className="h-1.5 w-full bg-white/[0.07] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#f26522] to-[#c44e18] transition-all duration-700"
              style={{ width: summary.total > 0 ? `${Math.round((summary.hot / summary.total) * 100)}%` : '0%' }}
            />
          </div>
          <p className="text-[10px] text-white/35 mt-1.5">
            {summary.hot} deals en etapas calientes
          </p>
        </div>
      )}

      {/* Bottom nav */}
      <div className="pb-3 px-2 space-y-0.5 border-t border-white/[0.06] pt-3">
        {BOTTOM_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl text-[13px] font-medium transition-all duration-150',
                collapsed ? 'h-10 w-10 mx-auto justify-center' : 'h-9 px-3',
                active
                  ? 'bg-[rgba(242,101,34,0.12)] text-white'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
              )}
            >
              <Icon className={cn('flex-shrink-0 w-4 h-4', active ? 'text-[#f26522]' : 'text-current')} />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          )
        })}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            'w-full flex items-center gap-2 rounded-xl text-[12px] text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all duration-150',
            collapsed ? 'h-10 justify-center' : 'h-9 px-3'
          )}
          title={collapsed ? 'Expandir' : 'Colapsar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Colapsar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
