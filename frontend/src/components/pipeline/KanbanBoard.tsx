import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useDroppable } from '@dnd-kit/core'
import { DealCard } from './DealCard'
import { api } from '../../lib/api'
import { ChevronDown, Loader2 } from 'lucide-react'

const STAGE_COLORS: Record<string, string> = {
  PROSPECTO_IDENTIFICADO: 'bg-slate-400',
  SENAL_DETECTADA: 'bg-blue-400',
  PRIMER_CONTACTO: 'bg-indigo-400',
  EN_SECUENCIA: 'bg-violet-400',
  REUNION_AGENDADA: 'bg-amber-400',
  PROPUESTA_ENVIADA: 'bg-orange-400',
  NEGOCIACION: 'bg-rose-400',
}

const STAGES = [
  { id: 'PROSPECTO_IDENTIFICADO', label: 'Prospecto Identificado' },
  { id: 'SENAL_DETECTADA', label: 'Señal Detectada' },
  { id: 'PRIMER_CONTACTO', label: 'Primer Contacto' },
  { id: 'EN_SECUENCIA', label: 'En Secuencia' },
  { id: 'REUNION_AGENDADA', label: 'Reunión Agendada' },
  { id: 'PROPUESTA_ENVIADA', label: 'Propuesta Enviada' },
  { id: 'NEGOCIACION', label: 'Negociación' },
]

const PAGE_SIZE = 30

interface ColumnState {
  deals: any[]
  total: number
  page: number
  loading: boolean
  loadingMore: boolean
}

function DroppableColumn({
  stage,
  colState,
  onDealClick,
  onLoadMore,
  activeDealId,
}: {
  stage: { id: string; label: string }
  colState: ColumnState
  onDealClick: (id: string) => void
  onLoadMore: () => void
  activeDealId: string | null
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  const dot = STAGE_COLORS[stage.id] ?? 'bg-blue-400'
  const { deals, total, loading, loadingMore } = colState
  const hasMore = deals.length < total

  return (
    <div className="w-[270px] shrink-0 flex flex-col" style={{ height: 'calc(100vh - 260px)' }}>
      {/* Column header */}
      <div className="flex items-center justify-between px-1 mb-2 shrink-0">
        <h3 className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${dot}`} />
          {stage.label}
        </h3>
        <span className="text-[10px] font-bold bg-surface-container py-0.5 px-2 rounded-full text-on-surface-variant">
          {loading ? '…' : total}
        </span>
      </div>

      {/* Scrollable drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto rounded-xl border border-dashed p-2 flex flex-col gap-2 transition-colors custom-scrollbar ${
          isOver
            ? 'bg-blue-50 border-blue-300'
            : 'bg-surface-container-low/30 border-outline-variant'
        }`}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={20} className="animate-spin text-on-surface-variant" />
          </div>
        ) : deals.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[11px] text-on-surface-variant">
            Sin oportunidades
          </div>
        ) : (
          <>
            {deals.map(deal => (
              <div
                key={deal.id}
                style={{ opacity: activeDealId === deal.id ? 0.4 : 1 }}
              >
                <DealCard deal={deal} onClick={() => onDealClick(deal.id)} />
              </div>
            ))}

            {hasMore && (
              <button
                onClick={onLoadMore}
                disabled={loadingMore}
                className="mt-1 w-full py-2 rounded-lg border border-outline-variant bg-white hover:bg-surface-container text-[11px] font-bold text-on-surface-variant flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {loadingMore ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <ChevronDown size={12} />
                )}
                {loadingMore ? 'Cargando...' : `Ver más (${total - deals.length} restantes)`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

interface Props { onDealClick: (id: string) => void }

export function KanbanBoard({ onDealClick }: Props) {
  const [columns, setColumns] = useState<Record<string, ColumnState>>(() =>
    Object.fromEntries(
      STAGES.map(s => [s.id, { deals: [], total: 0, page: 0, loading: true, loadingMore: false }])
    )
  )
  const [activeDeal, setActiveDeal] = useState<any>(null)
  // Track all deals for drag-and-drop (just ids + stage mapping)
  const allDealsRef = useRef<Record<string, any>>({})

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const fetchStage = useCallback(async (stageId: string, page: number) => {
    const skip = page * PAGE_SIZE
    const res = await api.get(`/deals?stage=${stageId}&limit=${PAGE_SIZE}&skip=${skip}`)
    return { data: res?.data ?? [], total: res?.total ?? 0 }
  }, [])

  // Initial load: fetch all stages in parallel
  useEffect(() => {
    Promise.all(
      STAGES.map(async s => {
        const { data, total } = await fetchStage(s.id, 0)
        data.forEach((d: any) => { allDealsRef.current[d.id] = d })
        return { id: s.id, data, total }
      })
    ).then(results => {
      setColumns(prev => {
        const next = { ...prev }
        results.forEach(({ id, data, total }) => {
          next[id] = { deals: data, total, page: 0, loading: false, loadingMore: false }
        })
        return next
      })
    })
  }, [fetchStage])

  const loadMore = useCallback(async (stageId: string) => {
    setColumns(prev => ({
      ...prev,
      [stageId]: { ...prev[stageId], loadingMore: true },
    }))
    const nextPage = columns[stageId].page + 1
    const { data, total } = await fetchStage(stageId, nextPage)
    data.forEach((d: any) => { allDealsRef.current[d.id] = d })
    setColumns(prev => ({
      ...prev,
      [stageId]: {
        ...prev[stageId],
        deals: [...prev[stageId].deals, ...data],
        total,
        page: nextPage,
        loadingMore: false,
      },
    }))
  }, [columns, fetchStage])

  const handleDragStart = (event: DragStartEvent) => {
    const deal = allDealsRef.current[event.active.id as string]
    setActiveDeal(deal ?? null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDeal(null)
    if (!over) return

    const dealId = active.id as string
    const overStageId = STAGES.find(s => s.id === over.id)?.id
      ?? allDealsRef.current[over.id as string]?.stage
    if (!overStageId) return

    const currentStage = allDealsRef.current[dealId]?.stage
    if (!currentStage || currentStage === overStageId) return

    // Optimistic: move card between columns
    const deal = allDealsRef.current[dealId]
    allDealsRef.current[dealId] = { ...deal, stage: overStageId }

    setColumns(prev => {
      const next = { ...prev }
      // Remove from old column
      next[currentStage] = {
        ...next[currentStage],
        deals: next[currentStage].deals.filter(d => d.id !== dealId),
        total: Math.max(0, next[currentStage].total - 1),
      }
      // Add to new column at top
      const updatedDeal = { ...deal, stage: overStageId }
      next[overStageId] = {
        ...next[overStageId],
        deals: [updatedDeal, ...next[overStageId].deals],
        total: next[overStageId].total + 1,
      }
      return next
    })

    await api.post(`/deals/${dealId}/move-stage`, { stage: overStageId })
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar" style={{ height: 'calc(100vh - 220px)' }}>
        {STAGES.map(stage => (
          <DroppableColumn
            key={stage.id}
            stage={stage}
            colState={columns[stage.id]}
            onDealClick={onDealClick}
            onLoadMore={() => loadMore(stage.id)}
            activeDealId={activeDeal?.id ?? null}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeDeal ? <DealCard deal={activeDeal} onClick={() => {}} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
