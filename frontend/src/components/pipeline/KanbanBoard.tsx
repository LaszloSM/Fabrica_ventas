import React, { useEffect, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { DealCard } from './DealCard'
import { api } from '../../lib/api'

const STAGES = [
  { id: 'PROSPECTO_IDENTIFICADO', label: 'Prospecto Identificado' },
  { id: 'SENAL_DETECTADA', label: 'Señal Detectada' },
  { id: 'PRIMER_CONTACTO', label: 'Primer Contacto' },
  { id: 'EN_SECUENCIA', label: 'En Secuencia' },
  { id: 'REUNION_AGENDADA', label: 'Reunión Agendada' },
  { id: 'PROPUESTA_ENVIADA', label: 'Propuesta Enviada' },
  { id: 'NEGOCIACION', label: 'Negociación' },
]

function DroppableColumn({ stage, deals, onDealClick }: {
  stage: { id: string; label: string }
  deals: any[]
  onDealClick: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })

  return (
    <div className="w-[280px] shrink-0 flex flex-col gap-3">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-brand-primary-container" />
          {stage.label}
        </h3>
        <span className="text-[10px] font-bold bg-surface-container py-0.5 px-2 rounded-full">
          {deals.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl border border-dashed p-3 flex flex-col gap-3 min-h-[300px] transition-colors ${
          isOver
            ? 'bg-blue-50 border-brand-primary-container'
            : 'bg-surface-container-low/30 border-outline-variant'
        }`}
      >
        <SortableContext items={deals.map(d => d.id)} strategy={verticalListSortingStrategy}>
          {deals.map(deal => (
            <SortableDeal key={deal.id} deal={deal} onDealClick={onDealClick} />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}

function SortableDeal({ deal, onDealClick }: { deal: any; onDealClick: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
    >
      <DealCard deal={deal} onClick={() => onDealClick(deal.id)} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  )
}

interface Props { onDealClick: (id: string) => void }

export function KanbanBoard({ onDealClick }: Props) {
  const [deals, setDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeDeal, setActiveDeal] = useState<any>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  useEffect(() => {
    api.get('/deals').then(d => {
      if (d) setDeals(Array.isArray(d) ? d : d.deals ?? [])
      setLoading(false)
    })
  }, [])

  const dealsByStage = (stageId: string) => deals.filter(d => d.stage === stageId)

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDeal(deals.find(d => d.id === event.active.id) ?? null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDeal(null)
    if (!over) return

    const dealId = active.id as string
    // over.id can be a stage id (column) or another deal id — find the stage
    const overStage = STAGES.find(s => s.id === over.id)
    const overDeal = deals.find(d => d.id === over.id)
    const newStage = overStage?.id ?? overDeal?.stage

    if (!newStage) return
    const currentDeal = deals.find(d => d.id === dealId)
    if (!currentDeal || currentDeal.stage === newStage) return

    // Optimistic update
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: newStage } : d))
    await api.post(`/deals/${dealId}/move-stage`, { stage: newStage })
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-on-surface-variant text-sm">Cargando pipeline...</div>
  )

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-6 custom-scrollbar">
        {STAGES.map(stage => (
          <DroppableColumn
            key={stage.id}
            stage={stage}
            deals={dealsByStage(stage.id)}
            onDealClick={onDealClick}
          />
        ))}
      </div>
      <DragOverlay>
        {activeDeal ? <DealCard deal={activeDeal} onClick={() => {}} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
