'use client'
import { colors, shadows } from '@/lib/design-system'
import { cn } from '@/lib/utils'
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
  primary: { bg: colors.primaryLight, text: colors.primary, iconBg: colors.primary },
  success: { bg: colors.successLight, text: colors.success, iconBg: colors.success },
  danger: { bg: colors.dangerLight, text: colors.danger, iconBg: colors.danger },
  warning: { bg: colors.warningLight, text: colors.warning, iconBg: colors.warning },
  info: { bg: colors.infoLight, text: colors.info, iconBg: colors.info },
}

export function KpiCard({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'primary' }: KpiCardProps) {
  const c = colorMap[color]
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-[#E2E8F0] bg-white p-5 transition-all hover:shadow-md"
      style={{ boxShadow: shadows.card }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[#64748B]">{title}</p>
          <p className="text-2xl font-bold text-[#1E293B]">{value}</p>
          {subtitle && <p className="text-xs text-[#94A3B8]">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1 text-xs font-medium">
              {trend === 'up' && <span className="text-[#1A7A4A]">↑ {trendValue}</span>}
              {trend === 'down' && <span className="text-[#DC2626]">↓ {trendValue}</span>}
              {trend === 'neutral' && <span className="text-[#64748B]">→ {trendValue}</span>}
            </div>
          )}
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: c.bg }}
        >
          <Icon className="h-5 w-5" style={{ color: c.iconBg }} />
        </div>
      </div>
    </div>
  )
}
