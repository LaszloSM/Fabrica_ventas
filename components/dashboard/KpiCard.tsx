'use client'
import type { LucideIcon } from 'lucide-react'

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
  primary: { gradient: 'from-[#f26522]/20 to-[#d5551a]/10', text: 'text-[#f26522]', iconBg: 'bg-[#f26522]/20', iconColor: 'text-[#f26522]' },
  success: { gradient: 'from-emerald-500/20 to-emerald-400/10', text: 'text-emerald-400', iconBg: 'bg-emerald-500/20', iconColor: 'text-emerald-400' },
  danger: { gradient: 'from-red-500/20 to-red-400/10', text: 'text-red-400', iconBg: 'bg-red-500/20', iconColor: 'text-red-400' },
  warning: { gradient: 'from-amber-500/20 to-amber-400/10', text: 'text-amber-400', iconBg: 'bg-amber-500/20', iconColor: 'text-amber-400' },
  info: { gradient: 'from-blue-500/20 to-blue-400/10', text: 'text-blue-400', iconBg: 'bg-blue-500/20', iconColor: 'text-blue-400' },
}

export function KpiCard({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'primary' }: KpiCardProps) {
  const c = colorMap[color]
  return (
    <div className={`relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br ${c.gradient} p-5 backdrop-blur-sm transition-all hover:border-white/20 hover:shadow-lg hover:shadow-${color === 'primary' ? 'orange' : color === 'success' ? 'emerald' : color === 'danger' ? 'red' : color === 'warning' ? 'amber' : 'blue'}-500/10`}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-white/60">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtitle && <p className="text-xs text-white/40">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1 text-xs font-medium">
              {trend === 'up' && <span className="text-emerald-400">↑ {trendValue}</span>}
              {trend === 'down' && <span className="text-red-400">↓ {trendValue}</span>}
              {trend === 'neutral' && <span className="text-white/40">→ {trendValue}</span>}
            </div>
          )}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${c.iconBg} backdrop-blur-sm`}>
          <Icon className={`h-5 w-5 ${c.iconColor}`} />
        </div>
      </div>
    </div>
  )
}
