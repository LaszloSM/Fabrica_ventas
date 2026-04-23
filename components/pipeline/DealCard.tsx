'use client'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { differenceInDays } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { DealWithRelations } from '@/types'

const SERVICE_LABELS: Record<string, string> = {
  CREDIMPACTO_GRUPOS: 'Crédito Grupos',
  CREDIMPACTO_FONDO_ROTATORIO: 'Fondo Rotatorio',
  CREDIMPACTO_CREDITOS: 'Créditos',
  CREDIMPACTO_PROVEEDORES: 'Proveedores',
  ACADEMIA_CURSO: 'Academia',
  CONSULTORIA_PROYECTO: 'Consultoría',
  FUNDACION_CONVENIO: 'Convenio',
  FUNDACION_CONVOCATORIA: 'Convocatoria',
  FUNDACION_FUNDRAISING: 'Fundraising',
  FUNDACION_EXPERIENCIA: 'Experiencia',
}

interface DealCardProps {
  deal: DealWithRelations
  onClick: () => void
}

export function DealCard({ deal, onClick }: DealCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id })

  const lastActivity = deal.activities[0]
  const daysSinceActivity = lastActivity
    ? differenceInDays(new Date(), new Date(lastActivity.doneAt))
    : differenceInDays(new Date(), new Date(deal.createdAt))

  const urgencyColor = daysSinceActivity >= 14 ? 'border-l-red-500' : daysSinceActivity >= 7 ? 'border-l-yellow-400' : 'border-l-transparent'

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'bg-white rounded-lg p-3 shadow-sm border border-gray-100 border-l-4 cursor-pointer hover:shadow-md transition-all select-none',
        urgencyColor,
        isDragging && 'opacity-50 rotate-2 shadow-xl'
      )}
    >
      <p className="font-medium text-gray-900 text-sm leading-tight">{deal.prospect.name}</p>
      <div className="flex items-center justify-between mt-2">
        <Badge variant="secondary" className="text-xs">{SERVICE_LABELS[deal.serviceType] || deal.serviceType}</Badge>
        {deal.value && (
          <span className="text-xs text-gray-500">${(deal.value / 1_000_000).toFixed(0)}M</span>
        )}
      </div>
      {deal.assignedUser && (
        <p className="text-xs text-gray-400 mt-1">{deal.assignedUser.name}</p>
      )}
      {daysSinceActivity >= 7 && (
        <p className={cn('text-xs mt-1 font-medium', daysSinceActivity >= 14 ? 'text-red-500' : 'text-yellow-500')}>
          {daysSinceActivity}d sin actividad
        </p>
      )}
    </div>
  )
}
