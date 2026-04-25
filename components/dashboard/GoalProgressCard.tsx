'use client'
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
    if (percent >= 80) return '#34d399'
    if (percent >= 40) return '#fbbf24'
    return '#ef4444'
  }

  const color = getColor()

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 transition-all hover:border-white/20 hover:bg-white/[0.07]">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">
            {goal.serviceType.replace(/_/g, ' ')}
          </h3>
          <Badge variant="secondary" className="mt-1 text-[10px] bg-white/10 text-white/50 border-0">
            {goal.region || 'Nacional'} · Q{goal.quarter}
          </Badge>
        </div>
        <CircularProgress percent={percent} color={color} />
      </div>

      <div className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold text-white">
              {goal.currentUnits}
              <span className="text-xs font-normal text-white/40">
                {' '}
                / {goal.targetUnits || '—'} unidades
              </span>
            </p>
            {goal.targetValue && (
              <p className="text-sm text-white/60">
                ${goal.currentValue.toLocaleString()}
                <span className="text-xs text-white/40">
                  {' '}
                  / ${goal.targetValue.toLocaleString()}
                </span>
              </p>
            )}
          </div>
          <span
            className="text-xs font-bold text-white px-2 py-1 rounded-md"
            style={{ backgroundColor: color + '30', color }}
          >
            {Math.round(percent)}%
          </span>
        </div>
        <Progress value={percent} className="h-2 bg-white/10" />
      </div>
    </div>
  )
}
