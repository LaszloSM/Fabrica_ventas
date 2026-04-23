'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import type { GoalWithProgress } from '@/types'

export function GoalProgressCard({ goal }: { goal: GoalWithProgress }) {
  const percent = goal.targetUnits 
    ? (goal.currentUnits / goal.targetUnits) * 100 
    : (goal.targetValue ? (goal.currentValue / goal.targetValue) * 100 : 0)

  const getColor = () => {
    if (percent >= 80) return 'bg-green-500'
    if (percent >= 40) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-sm font-semibold">{goal.serviceType.replace('_', ' ')}</CardTitle>
          <Badge variant="secondary" className="text-[10px]">{goal.region || 'Nacional'}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-2xl font-bold">{goal.currentUnits} <span className="text-xs text-gray-400 font-normal">/ {goal.targetUnits || '—'} unidades</span></p>
            {goal.targetValue && (
              <p className="text-sm text-gray-600">${goal.currentValue.toLocaleString()} <span className="text-xs text-gray-400">/ ${goal.targetValue.toLocaleString()}</span></p>
            )}
          </div>
          <span className={`text-xs font-bold text-white px-2 py-1 rounded ${getColor()}`}>
            {Math.round(percent)}%
          </span>
        </div>
        <Progress value={percent} className="h-2" />
      </CardContent>
    </Card>
  )
}
