'use client'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { differenceInDays } from 'date-fns'
import { cn } from '@/lib/utils'
import { Clock, AlertCircle } from 'lucide-react'
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

function getTemperature(stage: DealStage) {
  const coldStages = ['PROSPECTO_IDENTIFICADO', 'SENAL_DETECTADA', 'PRIMER_CONTACTO']
  const warmStages = ['EN_SECUENCIA', 'REUNION_AGENDADA']
  const hotStages = ['PROPUESTA_ENVIADA', 'NEGOCIACION', 'GANADO']
  if (coldStages.includes(stage)) return 'cold'
  if (warmStages.includes(stage)) return 'warm'
  if (hotStages.includes(stage)) return 'hot'
  return 'lost'
}

function getInitials(name?: string | null) {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

interface DealCardProps {
  deal: DealWithRelations
  onClick: () => void
}

export function DealCard({ deal, onClick }: DealCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id })

  const lastActivity = deal.activities?.[0]
  const daysSinceActivity = lastActivity
    ? differenceInDays(new Date(), new Date(lastActivity.doneAt))
    : differenceInDays(new Date(), new Date(deal.createdAt))

  const temp = getTemperature(deal.stage)
  const isStale = daysSinceActivity >= 7
  const isCritical = daysSinceActivity >= 14

  const prospectName = deal.prospect?.name || 'Sin organización'
  const contactName = deal.contact?.name
  const assignedName = deal.assignedUser?.name || deal.assignedTo || 'Sin asignar'
  const serviceLabel = SERVICE_LABELS[deal.serviceType] || deal.serviceType

  const tempConfig: Record<string, { color: string; label: string }> = {
    cold: { color: '#60a5fa', label: 'Frío' },
    warm: { color: '#fbbf24', label: 'Tibio' },
    hot: { color: '#f97316', label: 'Caliente' },
    lost: { color: '#6b7280', label: 'Perdido' },
  }
  const tc = tempConfig[temp]

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'group relative cursor-pointer select-none rounded-xl border transition-all duration-200 overflow-hidden',
        'bg-white/[0.035] border-white/[0.07]',
        'hover:bg-white/[0.055] hover:border-white/[0.13] hover:-translate-y-0.5',
        'hover:shadow-lg hover:shadow-black/20',
        'active:scale-[0.98] active:translate-y-0',
        isDragging && 'opacity-60 rotate-1 scale-[1.02] shadow-2xl z-50 border-white/20'
      )}
    >
      {/* Stale indicator top bar */}
      {(isStale || isCritical) && (
        <div
          className={cn('absolute top-0 left-0 right-0 h-[2px] rounded-t-xl',
            isCritical ? 'bg-red-500' : 'bg-amber-500'
          )}
        />
      )}

      <div className="p-3">
        {/* Top: Avatar + name */}
        <div className="flex items-start gap-2">
          {/* Avatar */}
          <div
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white transition-transform duration-300 group-hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #f26522 0%, #c44e18 100%)', boxShadow: '0 2px 8px rgba(242,101,34,0.25)' }}
          >
            {getInitials(prospectName)}
          </div>

          {/* Name + contact */}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white/[0.88] leading-tight truncate group-hover:text-white transition-colors duration-150">
              {prospectName}
            </p>
            {contactName && contactName !== prospectName && (
              <p className="text-[11px] text-white/40 truncate mt-0.5 leading-tight">{contactName}</p>
            )}
          </div>
        </div>

        {/* Service + temp badges */}
        <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
          <span className="inline-flex items-center rounded-md border border-white/[0.07] bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-white/55 leading-none">
            {serviceLabel}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-none"
            style={{
              background: `${tc.color}18`,
              color: tc.color,
              border: `1px solid ${tc.color}30`,
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: tc.color }} />
            {tc.label}
          </span>
        </div>

        {/* Proyectos */}
        {deal.proyectos && (
          <p className="text-[10px] text-white/30 mt-1.5 truncate leading-tight italic">
            {deal.proyectos}
          </p>
        )}

        {/* Footer: assigned + stale */}
        <div className="flex items-center justify-between mt-2.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white/[0.07] text-[9px] font-bold text-white/50 flex-shrink-0">
              {getInitials(assignedName)}
            </div>
            <span className="text-[10px] text-white/35 truncate max-w-[80px]">{assignedName}</span>
          </div>

          {isCritical ? (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-red-400">
              <AlertCircle className="w-3 h-3" />
              {daysSinceActivity}d
            </span>
          ) : isStale ? (
            <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400">
              <Clock className="w-3 h-3" />
              {daysSinceActivity}d
            </span>
          ) : (
            <span className="text-[10px] text-white/25">Activo</span>
          )}
        </div>
      </div>
    </div>
  )
}
