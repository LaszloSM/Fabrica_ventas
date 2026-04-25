'use client'
import { useEffect, useState } from 'react'
import { Flame, ArrowRight } from 'lucide-react'
import { colors, shadows } from '@/lib/design-system'
import type { DealWithRelations } from '@/types'

const HOT_STAGES = ['PROPUESTA_ENVIADA', 'NEGOCIACION', 'REUNION_AGENDADA']

export function UrgentActions() {
  const [deals, setDeals] = useState<DealWithRelations[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/deals')
      .then((r) => r.json())
      .then((j) => {
        const all = j.data || []
        const hot = all.filter((d: DealWithRelations) => HOT_STAGES.includes(d.stage))
        setDeals(hot.slice(0, 5))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-[#F1F5F9]" />
        ))}
      </div>
    )
  }

  if (deals.length === 0) {
    return <p className="text-sm text-[#94A3B8]">No hay acciones urgentes pendientes</p>
  }

  return (
    <div className="space-y-3">
      {deals.map((deal) => (
        <a
          key={deal.id}
          href={`/pipeline?deal=${deal.id}`}
          className="flex items-center gap-3 rounded-lg border border-[#E2E8F0] bg-white p-3 transition-all hover:shadow-sm hover:border-[#F26522]/30"
          style={{ boxShadow: shadows.sm }}
        >
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: colors.hotLight }}
          >
            <Flame className="h-4 w-4" style={{ color: colors.hot }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#1E293B] truncate">
              {deal.prospect?.name || 'Sin prospecto'}
            </p>
            <p className="text-xs text-[#64748B]">
              {deal.serviceType?.replace(/_/g, ' ')} · {deal.stage.replace(/_/g, ' ')}
            </p>
          </div>
          <div className="text-right">
            {deal.value && (
              <p className="text-sm font-semibold text-[#1A7A4A]">
                ${(deal.value / 1_000_000).toFixed(1)}M
              </p>
            )}
            <ArrowRight className="h-4 w-4 text-[#94A3B8] ml-auto mt-0.5" />
          </div>
        </a>
      ))}
    </div>
  )
}
