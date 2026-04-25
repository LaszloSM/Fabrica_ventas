'use client'
import { colors } from '@/lib/design-system'
import type { GoalWithProgress } from '@/types'

export function QuarterlyGrid({ goals }: { goals: GoalWithProgress[] }) {
  const quarters = [1, 2, 3, 4]
  const services = Array.from(new Set(goals.map((g) => g.serviceType)))

  const getCellStyle = (goal?: GoalWithProgress) => {
    if (!goal) return { bg: '#F8FAFC', text: '#94A3B8', label: '—' }
    const percent = goal.targetUnits
      ? (goal.currentUnits / goal.targetUnits) * 100
      : goal.targetValue
        ? (goal.currentValue / goal.targetValue) * 100
        : 0

    if (percent >= 80) return { bg: colors.successLight, text: colors.success, label: `${Math.round(percent)}%` }
    if (percent >= 40) return { bg: colors.warningLight, text: colors.warning, label: `${Math.round(percent)}%` }
    return { bg: colors.dangerLight, text: colors.danger, label: `${Math.round(percent)}%` }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#E2E8F0]">
            <th className="py-3 pr-4 text-left font-medium text-[#64748B]">Servicio</th>
            {quarters.map((q) => (
              <th key={q} className="py-3 px-2 text-center font-medium text-[#64748B]">
                Q{q}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {services.map((service) => (
            <tr key={service} className="border-b border-[#F1F5F9] last:border-0">
              <td className="py-3 pr-4 font-medium text-[#1E293B]">
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
