'use client'
import { useState, useEffect, useMemo } from 'react'
import {
  DndContext, DragEndEvent,
  PointerSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { DealCard } from './DealCard'
import { DealDrawer } from './DealDrawer'
import { Input } from '@/components/ui/input'
import { Search, Filter, X, Users, Thermometer, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DealWithRelations } from '@/types'
import { DealStage } from '@/types'

const STAGES: {
  key: DealStage
  label: string
  color: string
  shortLabel: string
}[] = [
  { key: 'PROSPECTO_IDENTIFICADO', label: 'Identificado',       shortLabel: 'ID',  color: '#64748b' },
  { key: 'SENAL_DETECTADA',        label: 'Señal Detectada',    shortLabel: 'SD',  color: '#f59e0b' },
  { key: 'PRIMER_CONTACTO',        label: 'Primer Contacto',    shortLabel: 'PC',  color: '#3b82f6' },
  { key: 'EN_SECUENCIA',           label: 'En Secuencia',       shortLabel: 'ES',  color: '#8b5cf6' },
  { key: 'REUNION_AGENDADA',       label: 'Reunión Agendada',   shortLabel: 'RA',  color: '#f26522' },
  { key: 'PROPUESTA_ENVIADA',      label: 'Propuesta Enviada',  shortLabel: 'PE',  color: '#ec4899' },
  { key: 'NEGOCIACION',            label: 'Negociación',        shortLabel: 'NG',  color: '#ef4444' },
  { key: 'GANADO',                 label: 'Ganado',             shortLabel: 'GA',  color: '#10b981' },
  { key: 'PERDIDO',                label: 'Perdido',            shortLabel: 'PR',  color: '#475569' },
]

function getTemperature(stage: DealStage): string {
  const coldStages = ['PROSPECTO_IDENTIFICADO', 'SENAL_DETECTADA', 'PRIMER_CONTACTO']
  const warmStages = ['EN_SECUENCIA', 'REUNION_AGENDADA']
  const hotStages = ['PROPUESTA_ENVIADA', 'NEGOCIACION', 'GANADO']
  if (coldStages.includes(stage)) return 'frio'
  if (warmStages.includes(stage)) return 'tibio'
  if (hotStages.includes(stage)) return 'caliente'
  return 'perdido'
}

export function KanbanBoard() {
  const [deals, setDeals] = useState<DealWithRelations[]>([])
  const [teamMembers, setTeamMembers] = useState<{id: string, name: string}[]>([])
  const [selected, setSelected] = useState<DealWithRelations | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterAssignedTo, setFilterAssignedTo] = useState<string>('')
  const [filterTemperature, setFilterTemperature] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)
        const [dealsRes, teamRes] = await Promise.all([
          fetch('/api/deals'),
          fetch('/api/team')
        ])
        if (!dealsRes.ok) throw new Error(`Error ${dealsRes.status}`)
        if (!teamRes.ok) throw new Error(`Error equipo ${teamRes.status}`)
        const dealsJson = await dealsRes.json()
        const teamJson = await teamRes.json()
        setDeals(dealsJson.data || [])
        setTeamMembers(teamJson.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const targetStage = over.id as DealStage
    if (!STAGES.find((s) => s.key === targetStage)) return
    const previousDeals = deals
    setDeals((prev) => prev.map((d) => d.id === active.id ? { ...d, stage: targetStage } : d))
    try {
      const res = await fetch(`/api/deals/${active.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: targetStage }),
      })
      if (!res.ok) throw new Error('API error')
    } catch {
      setDeals(previousDeals)
    }
  }

  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (
          !deal.prospect?.name?.toLowerCase().includes(q) &&
          !deal.contact?.name?.toLowerCase().includes(q)
        ) return false
      }
      if (filterAssignedTo && deal.assignedTo !== filterAssignedTo) return false
      if (filterTemperature && getTemperature(deal.stage) !== filterTemperature) return false
      return true
    })
  }, [deals, searchQuery, filterAssignedTo, filterTemperature])

  const dealsByStage = (stage: DealStage) => filteredDeals.filter((d) => d.stage === stage)
  const stageValue = (stage: DealStage) => dealsByStage(stage).reduce((sum, d) => sum + (d.value || 0), 0)
  const totalValue = filteredDeals.reduce((sum, d) => sum + (d.value || 0), 0)
  const hasActiveFilters = searchQuery || filterAssignedTo || filterTemperature

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#f26522]/30 border-t-[#f26522] animate-spin" />
          <span className="text-sm text-white/40">Cargando pipeline...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] p-5 max-w-sm">
        <p className="text-red-400 font-semibold text-sm">Error al cargar el pipeline</p>
        <p className="text-red-300/50 text-xs mt-1">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 px-4 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 rounded-lg text-xs font-medium transition-colors cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <Input
            placeholder="Buscar deal o empresa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm border-white/[0.07] bg-white/[0.04] text-white placeholder:text-white/30 focus-visible:ring-[#f26522]/30 focus-visible:border-white/15"
          />
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-1.5 px-3 h-9 rounded-xl border text-[13px] font-medium transition-all cursor-pointer',
            showFilters || hasActiveFilters
              ? 'bg-[rgba(242,101,34,0.12)] border-[rgba(242,101,34,0.25)] text-[#f26522]'
              : 'bg-white/[0.04] border-white/[0.07] text-white/50 hover:text-white/80 hover:bg-white/[0.07]'
          )}
        >
          <Filter className="w-3.5 h-3.5" />
          Filtrar
          {hasActiveFilters && (
            <span className="ml-0.5 px-1.5 py-0.5 rounded text-[10px] bg-[#f26522] text-white font-bold leading-none">
              ON
            </span>
          )}
        </button>

        {/* Stats */}
        <div className="flex items-center gap-3 ml-auto text-[13px]">
          <span className="text-white/40">
            <span className="font-semibold text-white">{filteredDeals.length}</span> deals
          </span>
          {totalValue > 0 && (
            <span className="text-white/40">
              <span className="font-semibold text-emerald-400">${(totalValue / 1_000_000).toFixed(1)}M</span> total
            </span>
          )}
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="flex items-center gap-4 flex-wrap rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-white/30" />
            <select
              value={filterAssignedTo}
              onChange={(e) => setFilterAssignedTo(e.target.value)}
              className="text-[12px] border border-white/[0.07] rounded-lg px-2.5 py-1.5 bg-white/[0.05] text-white/80 focus:outline-none focus:ring-1 focus:ring-[#f26522]/40 cursor-pointer"
            >
              <option value="" className="bg-[#0d0d1a]">Todos los responsables</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id} className="bg-[#0d0d1a]">{m.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Thermometer className="w-3.5 h-3.5 text-white/30" />
            <select
              value={filterTemperature}
              onChange={(e) => setFilterTemperature(e.target.value)}
              className="text-[12px] border border-white/[0.07] rounded-lg px-2.5 py-1.5 bg-white/[0.05] text-white/80 focus:outline-none focus:ring-1 focus:ring-[#f26522]/40 cursor-pointer"
            >
              <option value="" className="bg-[#0d0d1a]">Toda temperatura</option>
              <option value="frio" className="bg-[#0d0d1a]">Frío</option>
              <option value="tibio" className="bg-[#0d0d1a]">Tibio</option>
              <option value="caliente" className="bg-[#0d0d1a]">Caliente</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={() => { setSearchQuery(''); setFilterAssignedTo(''); setFilterTemperature('') }}
              className="flex items-center gap-1 text-[12px] text-white/40 hover:text-red-400 transition-colors cursor-pointer ml-auto"
            >
              <X className="w-3.5 h-3.5" />
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Kanban */}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4 min-h-[calc(100vh-220px)]" style={{ scrollbarWidth: 'thin' }}>
          {STAGES.map(({ key, label, color }) => {
            const count = dealsByStage(key).length
            const value = stageValue(key)
            const stageDeals = dealsByStage(key)

            return (
              <div key={key} className="flex-shrink-0 w-[268px] flex flex-col">
                {/* Column header */}
                <div className="mb-2.5 px-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full flex-shrink-0"
                        style={{ background: color, boxShadow: `0 0 6px ${color}80` }}
                      />
                      <h3 className="text-[12px] font-semibold text-white/75 leading-none">{label}</h3>
                    </div>
                    <span
                      className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md leading-none"
                      style={{
                        background: count > 0 ? `${color}18` : 'rgba(255,255,255,0.05)',
                        color: count > 0 ? color : 'rgba(255,255,255,0.3)',
                      }}
                    >
                      {count}
                    </span>
                  </div>
                  {value > 0 && (
                    <p className="text-[11px] text-white/35 pl-4 tabular-nums">
                      ${(value / 1_000_000).toFixed(1)}M
                    </p>
                  )}
                  {/* Stage color bar */}
                  <div className="mt-2 h-[2px] rounded-full" style={{ background: `${color}35` }}>
                    <div className="h-full rounded-full" style={{ width: count > 0 ? '100%' : '0%', background: color }} />
                  </div>
                </div>

                {/* Drop zone */}
                <div
                  id={key}
                  className={cn(
                    'flex-1 rounded-xl border border-white/[0.06] p-2 min-h-[120px] transition-all duration-200',
                    'bg-white/[0.02]',
                  )}
                >
                  <SortableContext items={stageDeals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {stageDeals.map((deal) => (
                        <DealCard key={deal.id} deal={deal} onClick={() => setSelected(deal)} />
                      ))}
                    </div>
                  </SortableContext>

                  {stageDeals.length === 0 && (
                    <div className="flex items-center justify-center h-20">
                      <div className="flex items-center gap-1.5 text-[11px] text-white/20">
                        <Plus className="w-3.5 h-3.5" />
                        Arrastra aquí
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </DndContext>

      {selected && (
        <DealDrawer
          deal={selected}
          onClose={() => setSelected(null)}
          onUpdate={(updated) => {
            setDeals((prev) => prev.map((d) => d.id === updated.id ? updated : d))
            setSelected(updated)
          }}
        />
      )}
    </div>
  )
}
