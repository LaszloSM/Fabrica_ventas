'use client'
import type { GoalWithProgress } from '@/types'

export function QuarterlyGrid({ goals }: { goals: GoalWithProgress[] }) {
  const quarters = [1, 2, 3, 4]
  const services = Array.from(new Set(goals.map((g) => g.serviceType)))

  const getCellStyle = (goal?: GoalWithProgress) => {
    if (!goal) return { bg: 'rgba(255,255,255,0.05)', text: 'rgba(255,255,255,0.3)', label: '—' }
    const percent = goal.targetUnits
      ? (goal.currentUnits / goal.targetUnits) * 100
      : goal.targetValue
        ? (goal.currentValue / goal.targetValue) * 100
        : 0

    if (percent >= 80) return { bg: 'rgba(52,211,153,0.15)', text: '#34d399', label: `${Math.round(percent)}%` }
    if (percent >= 40) return { bg: 'rgba(251,191,36,0.15)', text: '#fbbf24', label: `${Math.round(percent)}%` }
    return { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', label: `${Math.round(percent)}%` }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="py-3 pr-4 text-left font-medium text-white/50">Servicio</th>
            {quarters.map((q) => (
              <th key={q} className="py-3 px-2 text-center font-medium text-white/50">
                Q{q}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {services.map((service) => (
            <tr key={service} className="border-b border-white/5 last:border-0">
              <td className="py-3 pr-4 font-medium text-white">
                {service.replace(/_/g, ' ')}
              </td>
              {quarters.map((q) => {
                const goal = goals.find((g) => g.serviceType === service && g.quarter === q)
                const style = getCellStyle(goal)
                return (
                  <td key={q} className="py-3 px-2">
                    <div
                      className="mx-auto flex h-8 w-16 items-center justify-center rounded-md text-xs font-bold"
                      style={{ backgroundColor: style.bg, color: style.text }}
                    >
                      {style.label}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
