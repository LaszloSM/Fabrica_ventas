'use client'

interface LeaderboardEntry {
  name: string
  won: number
  pipeline: number
  deals: number
}

const MEDAL_COLORS = ['#f26522', '#64748B', '#D97706']

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
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition-all hover:border-white/20 hover:bg-white/[0.07]"
          >
            {/* Rank */}
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white flex-shrink-0"
              style={{
                backgroundColor: i < 3 ? MEDAL_COLORS[i] : 'rgba(255,255,255,0.1)',
              }}
            >
              {i + 1}
            </div>

            {/* Avatar */}
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-white/10 to-white/5 text-xs font-semibold text-white/70 flex-shrink-0">
              {getInitials(entry.name)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{entry.name}</p>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: i < 3 ? MEDAL_COLORS[i] : '#f26522',
                  }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-semibold text-white">
                ${(entry.pipeline / 1_000_000).toFixed(1)}M
              </p>
              <p className="text-[10px] text-white/40">{entry.deals ?? 0} deals</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
