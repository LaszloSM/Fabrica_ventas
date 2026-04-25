'use client'

interface FunnelData {
  stage: string
  label: string
  count: number
  value: number
}

const STAGE_COLORS = [
  '#64748B',
  '#8B5CF6',
  '#3b82f6',
  '#fbbf24',
  '#f26522',
  '#ec4899',
  '#ef4444',
  '#10b981',
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
              <span className="font-medium text-white">{item.label}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/50">
                  {index > 0 && (
                    <span className="mr-2 text-white/30">({conversionRate}%)</span>
                  )}
                  {item.count} deals
                </span>
                {item.value > 0 && (
                  <span className="text-xs font-semibold text-emerald-400">
                    ${(item.value / 1_000_000).toFixed(1)}M
                  </span>
                )}
              </div>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${widthPercent}%`,
                  backgroundColor: color,
                  boxShadow: `0 0 12px ${color}40`,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
