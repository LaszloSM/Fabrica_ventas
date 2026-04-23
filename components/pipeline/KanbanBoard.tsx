'use client'
import { useState, useEffect } from 'react'
import {
  DndContext, DragOverEvent, DragEndEvent, DragOverlay,
  PointerSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { DealCard } from './DealCard'
import { DealDrawer } from './DealDrawer'
import type { DealWithRelations } from '@/types'
import { DealStage } from '@/types'

const STAGES: { key: DealStage; label: string }[] = [
  { key: 'PROSPECTO_IDENTIFICADO', label: 'Identificado' },
  { key: 'SENAL_DETECTADA',        label: 'Señal ⚡' },
  { key: 'PRIMER_CONTACTO',        label: 'Primer Contacto' },
  { key: 'EN_SECUENCIA',           label: 'En Secuencia' },
  { key: 'REUNION_AGENDADA',       label: 'Reunión Agendada' },
  { key: 'PROPUESTA_ENVIADA',      label: 'Propuesta Enviada' },
  { key: 'NEGOCIACION',            label: 'Negociación' },
  { key: 'GANADO',                 label: '🏆 Ganado' },
  { key: 'PERDIDO',                label: 'Perdido' },
]

export function KanbanBoard() {
  const [deals, setDeals]       = useState<DealWithRelations[]>([])
  const [selected, setSelected] = useState<DealWithRelations | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    fetch('/api/deals').then((r) => r.json()).then((j) => setDeals(j.data || []))
  }, [])

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const targetStage = over.id as DealStage
    if (!STAGES.find((s) => s.key === targetStage)) return

    setDeals((prev) => prev.map((d) => d.id === active.id ? { ...d, stage: targetStage } : d))
    await fetch(`/api/deals/${active.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ stage: targetStage }),
    })
  }

  const dealsByStage = (stage: DealStage) => deals.filter((d) => d.stage === stage)
  const stageValue   = (stage: DealStage) => dealsByStage(stage).reduce((sum, d) => sum + (d.value || 0), 0)

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4 min-h-[calc(100vh-120px)]">
          {STAGES.map(({ key, label }) => (
            <div key={key} className="flex-shrink-0 w-64">
              <div className="bg-gray-100 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
                  <span className="text-xs text-gray-500 bg-white rounded px-1.5 py-0.5">
                    {dealsByStage(key).length}
                  </span>
                </div>
                {stageValue(key) > 0 && (
                  <p className="text-xs text-gray-500 mb-2">${(stageValue(key) / 1_000_000).toFixed(0)}M</p>
                )}
                <SortableContext items={dealsByStage(key).map((d) => d.id)} strategy={verticalListSortingStrategy}>
                  <div
                    id={key}
                    className="space-y-2 min-h-[80px]"
                  >
                    {dealsByStage(key).map((deal) => (
                      <DealCard key={deal.id} deal={deal} onClick={() => setSelected(deal)} />
                    ))}
                  </div>
                </SortableContext>
              </div>
            </div>
          ))}
        </div>
      </DndContext>
      {selected && (
        <DealDrawer deal={selected} onClose={() => setSelected(null)} onUpdate={(updated) => {
          setDeals((prev) => prev.map((d) => d.id === updated.id ? updated : d))
          setSelected(updated)
        }} />
      )}
    </>
  )
}
