'use client'
import { colors } from '@/lib/design-system'

interface FunnelData {
  stage: string
  label: string
  count: number
  value: number
}

const STAGE_COLORS = [
  colors.cold,
  '#8B5CF6',
  colors.info,
  colors.warning,
  colors.primary,
  '#EC4899',
  colors.danger,
  colors.success,
]

export function FunnelChart({ data }: { data: FunnelData[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="space-y-3">
      {data.map((item, index) => {
        const widthPercent = (item.count / maxCount) * 100
        const color = STAGE_COLORS[index % STAGE_COLORS.length]
        const prevCount = index > 0 ? data[index - 1].count : item.count
        const conversionRate = prevCount > 0 ? Math.round((item.count / prevCount) * 100) : 100

        return (
          <div key={item.stage} className="relative">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-[#1E293B]">{item.label}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#64748B]">
                  {index > 0 && (
                    <span className="mr-2 text-[#94A3B8]">({conversionRate}%)</span>
                  )}
                  {item.count} deals
                </span>
                {item.value > 0 && (
                  <span className="text-xs font-semibold text-[#1A7A4A]">
                    ${(item.value / 1_000_000).toFixed(1)}M
                  </span>
                )}
              </div>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${widthPercent}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
