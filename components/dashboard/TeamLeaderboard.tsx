'use client'
import { colors, shadows } from '@/lib/design-system'

interface LeaderboardEntry {
  name: string
  won: number
  pipeline: number
  deals: number
}

const MEDAL_COLORS = ['#F26522', '#64748B', '#D97706']

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function TeamLeaderboard({ data }: { data: LeaderboardEntry[] }) {
  const maxPipeline = Math.max(...data.map((d) => d.pipeline), 1)

  return (
    <div className="space-y-3">
      {data.map((entry, i) => {
        const barWidth = (entry.pipeline / maxPipeline) * 100
        return (
          <div
            key={entry.name}
            className="flex items-center gap-3 rounded-lg border border-[#E2E8F0] bg-white p-3 transition-all hover:shadow-sm"
            style={{ boxShadow: shadows.sm }}
          >
            {/* Rank */}
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{
                backgroundColor: i < 3 ? MEDAL_COLORS[i] : colors.border,
              }}
            >
              {i + 1}
            </div>

            {/* Avatar */}
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F1F5F9] text-xs font-semibold text-[#64748B]">
              {getInitials(entry.name)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#1E293B] truncate">{entry.name}</p>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: i < 3 ? MEDAL_COLORS[i] : colors.primary,
                  }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="text-right">
              <p className="text-sm font-semibold text-[#1E293B]">
                ${(entry.pipeline / 1_000_000).toFixed(1)}M
              </p>
              <p className="text-[10px] text-[#94A3B8]">{entry.deals ?? 0} deals</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
