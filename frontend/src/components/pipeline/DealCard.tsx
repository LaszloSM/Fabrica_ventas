import React from 'react'
import { motion } from 'motion/react'
import { MoreVertical } from 'lucide-react'

const BORDER_COLORS: Record<string, string> = {
  GANADO: 'border-l-green-500',
  PERDIDO: 'border-l-red-400',
  NEGOCIACION: 'border-l-orange-400',
}

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

interface Props {
  deal: any
  onClick: () => void
  dragHandleProps?: Record<string, any>
}

export function DealCard({ deal, onClick, dragHandleProps }: Props) {
  const borderColor = BORDER_COLORS[deal.stage] ?? 'border-l-brand-primary-container'
  const name = deal.prospect?.name ?? deal.prospectName ?? '—'
  const service = (deal.serviceType ?? '').replace(/_/g, ' ')
  const assignee = deal.assignedUser?.name ?? deal.assignedToName ?? '?'

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={`bg-white p-4 rounded-xl border border-outline-variant shadow-sm cursor-pointer border-l-4 ${borderColor}`}
      {...dragHandleProps}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-sm font-bold text-brand-primary-container leading-tight">{name}</h4>
        <button className="text-on-surface-variant p-0.5" onClick={e => e.stopPropagation()}>
          <MoreVertical size={14} />
        </button>
      </div>
      <p className="text-xs text-on-surface-variant leading-relaxed">{service}</p>
      <div className="flex justify-between items-center mt-4 pt-4 border-t border-outline-variant/30">
        <span className="text-sm font-bold">{fmt(deal.value ?? 0)}</span>
        <div className="w-6 h-6 rounded-full bg-brand-primary-container flex items-center justify-center text-[10px] text-white font-bold">
          {assignee[0].toUpperCase()}
        </div>
      </div>
    </motion.div>
  )
}
