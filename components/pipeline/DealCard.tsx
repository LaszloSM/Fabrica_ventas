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

const TEMPERATURE_CONFIG: Record<string, { label: string; gradient: string; glow: string }> = {
  cold: { label: 'Frío', gradient: 'from-blue-500/20 to-cyan-400/10', glow: 'shadow-blue-500/30' },
  warm: { label: 'Tibio', gradient: 'from-amber-500/20 to-yellow-400/10', glow: 'shadow-amber-500/30' },
  hot: { label: 'Caliente', gradient: 'from-red-500/20 to-orange-400/10', glow: 'shadow-red-500/30' },
  lost: { label: 'Perdido', gradient: 'from-gray-500/20 to-gray-400/10', glow: 'shadow-gray-500/20' },
}

function getInitials(name?: string | null) {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function getTemperature(stage: DealStage): keyof typeof TEMPERATURE_CONFIG {
  const coldStages = ['PROSPECTO_IDENTIFICADO', 'SENAL_DETECTADA', 'PRIMER_CONTACTO']
  const warmStages = ['EN_SECUENCIA', 'REUNION_AGENDADA']
  const hotStages = ['PROPUESTA_ENVIADA', 'NEGOCIACION', 'GANADO']

  if (coldStages.includes(stage)) return 'cold'
  if (warmStages.includes(stage)) return 'warm'
  if (hotStages.includes(stage)) return 'hot'
  return 'lost'
}

function getActivityUrgency(days: number) {
  if (days >= 14) return { color: '#ef4444', label: `${days}d`, width: '100%', pulse: true }
  if (days >= 7) return { color: '#f59e0b', label: `${days}d`, width: '66%', pulse: false }
  if (days >= 3) return { color: '#f26522', label: `${days}d`, width: '33%', pulse: false }
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

  const tempKey = getTemperature(deal.stage)
  const temp = TEMPERATURE_CONFIG[tempKey]
  const urgency = getActivityUrgency(daysSinceActivity)

  const prospectName = deal.prospect?.name || 'Sin organización'
  const contactName = deal.contact?.name
  const assignedName = deal.assignedUser?.name || deal.assignedTo || 'Sin asignar'

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'group relative cursor-pointer select-none transition-all duration-300',
        'rounded-xl border border-white/10 p-3.5',
        'bg-gradient-to-br ' + temp.gradient,
        'backdrop-blur-md',
        'hover:shadow-lg hover:shadow-' + temp.glow + ' hover:-translate-y-1 hover:border-white/20',
        'active:scale-[0.98]',
        isDragging && 'opacity-70 rotate-2 scale-105 shadow-2xl z-50'
      )}
    >
      {/* Glow border effect */}
      <div className={cn(
        'absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500',
        'bg-gradient-to-r ' + temp.gradient
      )} style={{ filter: 'blur(8px)', zIndex: -1 }} />

      {/* Top row: Avatar + Name + Value */}
      <div className="flex items-start gap-2.5 relative z-10">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#f26522] to-[#d5551a] text-[10px] font-bold text-white shadow-lg shadow-orange-500/30">
          {getInitials(prospectName)}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-semibold text-white leading-tight truncate group-hover:text-[#f26522] transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              if (deal.contact?.id) router.push(`/contacts/${deal.contact.id}`)
            }}
          >
            {prospectName}
          </p>
          {contactName && contactName !== prospectName && (
            <p className="text-[11px] text-white/50 truncate mt-0.5">
              {contactName}
            </p>
          )}
        </div>
        {deal.value ? (
          <span className="text-xs font-bold text-emerald-400 flex-shrink-0">
            ${(deal.value / 1_000_000).toFixed(0)}M
          </span>
        ) : null}
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap relative z-10">
        <Badge variant="secondary" className="text-[10px] bg-white/10 text-white/70 border-0 font-medium">
          {SERVICE_LABELS[deal.serviceType] || deal.serviceType}
        </Badge>
        <span className={cn(
          'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold border',
          tempKey === 'cold' && 'bg-blue-500/20 text-blue-300 border-blue-400/30',
          tempKey === 'warm' && 'bg-amber-500/20 text-amber-300 border-amber-400/30',
          tempKey === 'hot' && 'bg-red-500/20 text-red-300 border-red-400/30',
          tempKey === 'lost' && 'bg-gray-500/20 text-gray-400 border-gray-400/30',
        )}>
          <span className={cn('h-1.5 w-1.5 rounded-full', urgency?.pulse && 'animate-pulse', tempKey === 'cold' && 'bg-blue-400', tempKey === 'warm' && 'bg-amber-400', tempKey === 'hot' && 'bg-red-400', tempKey === 'lost' && 'bg-gray-400')} />
          {temp.label}
        </span>
      </div>

      {/* Bottom row: Assigned + Activity bar */}
      <div className="flex items-center justify-between mt-2.5 relative z-10">
        <div className="flex items-center gap-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[9px] font-bold text-white/60">
            {getInitials(assignedName)}
          </div>
          <span className="text-[10px] text-white/40 truncate max-w-[80px]">{assignedName}</span>
        </div>

        {urgency ? (
          <div className="flex items-center gap-1.5">
            <div className="h-1 w-8 overflow-hidden rounded-full bg-white/10">
              <div
                className={cn('h-full rounded-full transition-all', urgency.pulse && 'animate-pulse')}
                style={{ width: urgency.width, backgroundColor: urgency.color }}
              />
            </div>
            <span className="text-[10px] font-medium" style={{ color: urgency.color }}>{urgency.label}</span>
          </div>
        ) : (
          <span className="text-[10px] text-white/30">Activo</span>
        )}
      </div>
    </div>
  )
}
