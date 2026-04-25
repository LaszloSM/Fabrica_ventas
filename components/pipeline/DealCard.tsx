'use client'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { differenceInDays } from 'date-fns'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { DealWithRelations } from '@/types'
import { DealStage } from '@/types'

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

// Determinar temperatura basada en stage
function getTemperature(stage: DealStage) {
  const coldStages = ['PROSPECTO_IDENTIFICADO', 'SENAL_DETECTADA', 'PRIMER_CONTACTO']
  const warmStages = ['EN_SECUENCIA', 'REUNION_AGENDADA']
  const hotStages = ['PROPUESTA_ENVIADA', 'NEGOCIACION', 'GANADO']
  
  if (coldStages.includes(stage)) return { label: 'Frío', color: 'bg-blue-100 text-blue-700 border-blue-200', emoji: '🔵' }
  if (warmStages.includes(stage)) return { label: 'Tibio', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', emoji: '🟡' }
  if (hotStages.includes(stage)) return { label: 'Caliente', color: 'bg-red-100 text-red-700 border-red-200', emoji: '🔴' }
  return { label: 'Perdido', color: 'bg-gray-100 text-gray-600 border-gray-200', emoji: '⚫' }
}

export function DealCard({ deal, onClick }: DealCardProps) {
  const router = useRouter()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id })

  const lastActivity = deal.activities?.[0]
  const daysSinceActivity = lastActivity
    ? differenceInDays(new Date(), new Date(lastActivity.doneAt))
    : differenceInDays(new Date(), new Date(deal.createdAt))

  const urgencyColor = daysSinceActivity >= 14 ? 'border-l-red-500' : daysSinceActivity >= 7 ? 'border-l-yellow-400' : 'border-l-transparent'
  const temperature = getTemperature(deal.stage)

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
      {/* Nombre del prospecto - clickeable para ir a contacto 360 */}
      <p
        className="font-medium text-gray-900 text-sm leading-tight hover:text-green-700 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation()
          if (deal.contact?.id) {
            router.push(`/contacts/${deal.contact.id}`)
          }
        }}
      >
        {deal.prospect?.name || 'Sin nombre'}
      </p>
      
      {/* Contacto principal */}
      {deal.contact?.name && deal.contact.name !== deal.prospect?.name && (
        <p
          className="text-xs text-gray-500 mt-0.5 hover:text-green-700 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation()
            if (deal.contact?.id) {
              router.push(`/contacts/${deal.contact.id}`)
            }
          }}
        >
          {deal.contact.name}
        </p>
      )}
      
      {/* Badges de servicio y temperatura */}
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700">
          {SERVICE_LABELS[deal.serviceType] || deal.serviceType}
        </Badge>
        <Badge className={`text-xs ${temperature.color} border`}>
          {temperature.emoji} {temperature.label}
        </Badge>
      </div>
      
      {/* Valor y responsable */}
      <div className="flex items-center justify-between mt-2">
        {deal.value ? (
          <span className="text-xs font-semibold text-gray-700">
            ${(deal.value / 1_000_000).toFixed(0)}M
          </span>
        ) : (
          <span className="text-xs text-gray-400">Sin valor</span>
        )}
        
        {deal.assignedUser?.name ? (
          <span className="text-xs text-gray-500 bg-gray-50 rounded px-1.5 py-0.5">
            {deal.assignedUser.name}
          </span>
        ) : deal.assignedTo ? (
          <span className="text-xs text-gray-500 bg-gray-50 rounded px-1.5 py-0.5">
            {deal.assignedTo}
          </span>
        ) : null}
      </div>
      
      {/* Alerta de inactividad */}
      {daysSinceActivity >= 7 && (
        <div className={cn(
          'flex items-center gap-1 mt-2 text-xs font-medium',
          daysSinceActivity >= 14 ? 'text-red-600' : 'text-yellow-600'
        )}>
          <span>{daysSinceActivity}d sin actividad</span>
        </div>
      )}
    </div>
  )
}
