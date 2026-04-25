'use client'
import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  color?: 'primary' | 'success' | 'danger' | 'warning' | 'info'
}

const colorMap = {
  primary: { icon: '#f26522', iconBg: 'rgba(242,101,34,0.12)', border: 'rgba(242,101,34,0.18)', text: '#f26522' },
  success: { icon: '#10b981', iconBg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.18)', text: '#10b981' },
  danger:  { icon: '#ef4444', iconBg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.18)',  text: '#ef4444' },
  warning: { icon: '#f59e0b', iconBg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.18)', text: '#f59e0b' },
  info:    { icon: '#3b82f6', iconBg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.18)', text: '#3b82f6' },
}

export function KpiCard({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'primary' }: KpiCardProps) {
  const c = colorMap[color]
  return (
    <div
      className="relative rounded-xl border bg-white/[0.03] p-5 transition-all duration-200 hover:bg-white/[0.05] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20"
      style={{ borderColor: c.border }}
    >
      {/* Icon */}
      <div
        className="flex h-9 w-9 items-center justify-center rounded-lg mb-4"
        style={{ background: c.iconBg }}
      >
        <Icon className="h-4 w-4" style={{ color: c.icon }} />
      </div>

      {/* Value */}
      <p className="text-[11px] font-medium text-white/45 mb-1 uppercase tracking-wide">{title}</p>
      <p className="text-2xl font-bold text-white tabular-nums">{value}</p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        {subtitle && <p className="text-[11px] text-white/35">{subtitle}</p>}
        {trend && trendValue && (
          <div className="flex items-center gap-1 text-[11px] font-semibold ml-auto">
            {trend === 'up' && <><TrendingUp className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">{trendValue}</span></>}
            {trend === 'down' && <><TrendingDown className="w-3 h-3 text-red-400" /><span className="text-red-400">{trendValue}</span></>}
            {trend === 'neutral' && <><Minus className="w-3 h-3 text-white/40" /><span className="text-white/40">{trendValue}</span></>}
          </div>
        )}
      </div>
    </div>
  )
}
