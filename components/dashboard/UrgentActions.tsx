'use client'
import { useEffect, useState } from 'react'
import { Flame, ArrowRight } from 'lucide-react'
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
          <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    )
  }

  if (deals.length === 0) {
    return (
      <div className="text-center py-6">
        <Flame className="mx-auto h-8 w-8 text-white/10 mb-2" />
        <p className="text-sm text-white/40">No hay acciones urgentes pendientes</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {deals.map((deal) => (
        <a
          key={deal.id}
          href={`/pipeline?deal=${deal.id}`}
          className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition-all hover:border-[#f26522]/30 hover:bg-white/[0.07] group"
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#f26522]/15">
            <Flame className="h-4 w-4 text-[#f26522]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate group-hover:text-[#f26522] transition-colors">
              {deal.prospect?.name || 'Sin prospecto'}
            </p>
            <p className="text-xs text-white/40">
              {deal.serviceType?.replace(/_/g, ' ')} · {deal.stage.replace(/_/g, ' ')}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            {deal.value && (
              <p className="text-sm font-semibold text-emerald-400">
                ${(deal.value / 1_000_000).toFixed(1)}M
              </p>
            )}
            <ArrowRight className="h-4 w-4 text-white/30 ml-auto mt-0.5 group-hover:text-[#f26522] transition-colors" />
          </div>
        </a>
      ))}
    </div>
  )
}
