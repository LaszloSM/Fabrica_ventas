'use client'
import { colors, shadows } from '@/lib/design-system'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { CircularProgress } from './CircularProgress'
import type { GoalWithProgress } from '@/types'

export function GoalProgressCard({ goal }: { goal: GoalWithProgress }) {
  const percent = goal.targetUnits
    ? (goal.currentUnits / goal.targetUnits) * 100
    : goal.targetValue
      ? (goal.currentValue / goal.targetValue) * 100
      : 0

  const getColor = () => {
    if (percent >= 80) return colors.success
    if (percent >= 40) return colors.warning
    return colors.danger
  }

  const color = getColor()

  return (
    <div
      className="rounded-xl border border-[#E2E8F0] bg-white p-5 transition-all hover:shadow-md"
      style={{ boxShadow: shadows.card }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[#1E293B]">
            {goal.serviceType.replace(/_/g, ' ')}
          </h3>
          <Badge variant="secondary" className="mt-1 text-[10px] bg-[#F1F5F9] text-[#64748B]">
            {goal.region || 'Nacional'} · Q{goal.quarter}
          </Badge>
        </div>
        <CircularProgress percent={percent} color={color} />
      </div>

      <div className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold text-[#1E293B]">
              {goal.currentUnits}
              <span className="text-xs font-normal text-[#94A3B8]">
                {' '}
                / {goal.targetUnits || '—'} unidades
              </span>
            </p>
            {goal.targetValue && (
              <p className="text-sm text-[#64748B]">
                ${goal.currentValue.toLocaleString()}
                <span className="text-xs text-[#94A3B8]">
                  {' '}
                  / ${goal.targetValue.toLocaleString()}
                </span>
              </p>
            )}
          </div>
          <span
            className="text-xs font-bold text-white px-2 py-1 rounded-md"
            style={{ backgroundColor: color }}
          >
            {Math.round(percent)}%
          </span>
        </div>
        <Progress value={percent} className="h-2" />
      </div>
    </div>
  )
}
