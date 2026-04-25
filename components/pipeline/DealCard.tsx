'use client'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { differenceInDays } from 'date-fns'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { colors } from '@/lib/design-system'
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

function getInitials(name?: string | null) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getTemperature(stage: DealStage) {
  const coldStages = ['PROSPECTO_IDENTIFICADO', 'SENAL_DETECTADA', 'PRIMER_CONTACTO']
  const warmStages = ['EN_SECUENCIA', 'REUNION_AGENDADA']
  const hotStages = ['PROPUESTA_ENVIADA', 'NEGOCIACION', 'GANADO']

  if (coldStages.includes(stage)) {
    return { label: 'Frío', bg: colors.coldLight, text: colors.cold, dot: colors.cold }
  }
  if (warmStages.includes(stage)) {
    return { label: 'Tibio', bg: colors.warmLight, text: colors.warm, dot: colors.warm }
  }
  if (hotStages.includes(stage)) {
    return { label: 'Caliente', bg: colors.hotLight, text: colors.hot, dot: colors.hot }
  }
  return { label: 'Perdido', bg: '#F3F4F6', text: '#6B7280', dot: '#6B7280' }
}

function getActivityUrgency(days: number) {
  if (days >= 14) return { color: colors.danger, label: `${days}d`, width: '100%' }
  if (days >= 7) return { color: colors.warning, label: `${days}d`, width: '66%' }
  if (days >= 3) return { color: colors.primary, label: `${days}d`, width: '33%' }
  return null
}

interface DealCardProps {
  deal: DealWithRelations
  onClick: () => void
}

export function DealCard({ deal, onClick }: DealCardProps) {
  const router = useRouter()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id })

  const lastActivity = deal.activities?.[0]
  const daysSinceActivity = lastActivity
    ? differenceInDays(new Date(), new Date(lastActivity.doneAt))
    : differenceInDays(new Date(), new Date(deal.createdAt))

  const temperature = getTemperature(deal.stage)
  const urgency = getActivityUrgency(daysSinceActivity)

  const assignedName = deal.assignedUser?.name || deal.assignedTo || 'Sin asignar'

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'group relative bg-white rounded-xl border border-[#E2E8F0] p-3.5 cursor-pointer select-none transition-all',
        'hover:shadow-md hover:-translate-y-0.5',
        isDragging && 'opacity-60 rotate-2 shadow-xl scale-105'
      )}
    >
      {/* Top row: Avatar + Name + Value */}
      <div className="flex items-start gap-2.5">
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
          style={{ backgroundColor: colors.primary }}
        >
          {getInitials(deal.prospect?.name)}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-semibold text-[#1E293B] leading-tight truncate group-hover:text-[#F26522] transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              if (deal.contact?.id) {
                router.push(`/contacts/${deal.contact.id}`)
              }
            }}
          >
            {deal.prospect?.name || 'Sin nombre'}
          </p>
          {deal.contact?.name && deal.contact.name !== deal.prospect?.name && (
            <p
              className="text-[11px] text-[#94A3B8] truncate mt-0.5 hover:text-[#64748B] cursor-pointer"
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
        </div>
        {deal.value ? (
          <span className="text-xs font-bold text-[#1A7A4A] flex-shrink-0">
            ${(deal.value / 1_000_000).toFixed(0)}M
          </span>
        ) : null}
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
        <Badge
          variant="secondary"
          className="text-[10px] bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] font-medium"
        >
          {SERVICE_LABELS[deal.serviceType] || deal.serviceType}
        </Badge>
        <span
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold border"
          style={{ backgroundColor: temperature.bg, color: temperature.text, borderColor: `${temperature.text}20` }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: temperature.dot }} />
          {temperature.label}
        </span>
      </div>

      {/* Bottom row: Assigned + Activity bar */}
      <div className="flex items-center justify-between mt-2.5">
        <div className="flex items-center gap-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F1F5F9] text-[9px] font-bold text-[#64748B]">
            {getInitials(assignedName)}
          </div>
          <span className="text-[10px] text-[#94A3B8] truncate max-w-[80px]">{assignedName}</span>
        </div>

        {urgency ? (
          <div className="flex items-center gap-1.5">
            <div className="h-1 w-8 overflow-hidden rounded-full bg-[#F1F5F9]">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: urgency.width, backgroundColor: urgency.color }}
              />
            </div>
            <span className="text-[10px] font-medium" style={{ color: urgency.color }}>
              {urgency.label}
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-[#94A3B8]">Activo</span>
        )}
      </div>
    </div>
  )
}
