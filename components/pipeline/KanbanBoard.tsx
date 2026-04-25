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
import { Badge } from '@/components/ui/badge'
import { Search, Filter, X, Users, Thermometer, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DealWithRelations } from '@/types'
import { DealStage } from '@/types'

const STAGES: { key: DealStage; label: string; color: string; glow: string }[] = [
  { key: 'PROSPECTO_IDENTIFICADO', label: 'Identificado', color: '#64748b', glow: 'shadow-slate-500/20' },
  { key: 'SENAL_DETECTADA',        label: 'Señal', color: '#f59e0b', glow: 'shadow-amber-500/20' },
  { key: 'PRIMER_CONTACTO',        label: 'Primer Contacto', color: '#3b82f6', glow: 'shadow-blue-500/20' },
  { key: 'EN_SECUENCIA',           label: 'En Secuencia', color: '#8b5cf6', glow: 'shadow-violet-500/20' },
  { key: 'REUNION_AGENDADA',       label: 'Reunión Agendada', color: '#f26522', glow: 'shadow-orange-500/20' },
  { key: 'PROPUESTA_ENVIADA',      label: 'Propuesta Enviada', color: '#ec4899', glow: 'shadow-pink-500/20' },
  { key: 'NEGOCIACION',            label: 'Negociación', color: '#ef4444', glow: 'shadow-red-500/20' },
  { key: 'GANADO',                 label: 'Ganado', color: '#10b981', glow: 'shadow-emerald-500/20' },
  { key: 'PERDIDO',                label: 'Perdido', color: '#6b7280', glow: 'shadow-gray-500/20' },
]

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
        if (!dealsRes.ok) throw new Error(`Error cargando deals: ${dealsRes.status}`)
        if (!teamRes.ok) throw new Error(`Error cargando equipo: ${teamRes.status}`)
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
        const matchProspect = deal.prospect?.name?.toLowerCase().includes(q)
        const matchContact = deal.contact?.name?.toLowerCase().includes(q)
        const matchOrg = deal.prospect?.name?.toLowerCase().includes(q)
        if (!matchProspect && !matchContact && !matchOrg) return false
      }
      if (filterAssignedTo && deal.assignedTo !== filterAssignedTo) return false
      if (filterTemperature) {
        const temp = getTemperature(deal.stage)
        if (temp !== filterTemperature) return false
      }
      return true
    })
  }, [deals, searchQuery, filterAssignedTo, filterTemperature])

  const dealsByStage = (stage: DealStage) => filteredDeals.filter((d) => d.stage === stage)
  const stageCount = (stage: DealStage) => dealsByStage(stage).length
  const stageValue = (stage: DealStage) => dealsByStage(stage).reduce((sum, d) => sum + (d.value || 0), 0)
  const totalValue = filteredDeals.reduce((sum, d) => sum + (d.value || 0), 0)
  const hasActiveFilters = searchQuery || filterAssignedTo || filterTemperature

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-white/40">
          <Zap className="w-5 h-5 animate-pulse" />
          <span className="text-sm">Cargando pipeline...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
        <p className="text-red-400 font-medium">Error al cargar el pipeline</p>
        <p className="text-red-300/60 text-sm mt-1">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-3 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors">
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input
              placeholder="Buscar por contacto o empresa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-[#f26522]/50"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all',
              showFilters || hasActiveFilters
                ? 'bg-[#f26522]/20 border-[#f26522]/30 text-[#f26522]'
                : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
            )}
          >
            <Filter className="w-4 h-4" />
            Filtros
            {hasActiveFilters && (
              <Badge variant="secondary" className="bg-[#f26522]/20 text-[#f26522] text-xs border-0">
                Activos
              </Badge>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 pt-2 border-t border-white/10">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-white/30" />
              <select
                value={filterAssignedTo}
                onChange={(e) => setFilterAssignedTo(e.target.value)}
                className="text-sm border border-white/10 rounded-lg px-3 py-1.5 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-[#f26522]/50"
              >
                <option value="" className="bg-[#1a1a2e]">Todos los responsables</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#1a1a2e]">{m.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-white/30" />
              <select
                value={filterTemperature}
                onChange={(e) => setFilterTemperature(e.target.value)}
                className="text-sm border border-white/10 rounded-lg px-3 py-1.5 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-[#f26522]/50"
              >
                <option value="" className="bg-[#1a1a2e]">Todas las temperaturas</option>
                <option value="frio" className="bg-[#1a1a2e]">Frío</option>
                <option value="tibio" className="bg-[#1a1a2e]">Tibio</option>
                <option value="caliente" className="bg-[#1a1a2e]">Caliente</option>
              </select>
            </div>
            {hasActiveFilters && (
              <button
                onClick={() => { setSearchQuery(''); setFilterAssignedTo(''); setFilterTemperature('') }}
                className="flex items-center gap-1 text-sm text-red-400 hover:text-red-300 px-2 transition-colors"
              >
                <X className="w-3 h-3" />
                Limpiar
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-white/40 pt-1">
          <span className="font-medium text-white">{filteredDeals.length} deals</span>
          {totalValue > 0 && (
            <span>Valor total: <strong className="text-emerald-400">${(totalValue / 1_000_000).toFixed(1)}M</strong></span>
          )}
        </div>
      </div>

      {/* Kanban */}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-240px)]">
          {STAGES.map(({ key, label, color, glow }) => {
            const count = stageCount(key)
            const value = stageValue(key)
            const stageDeals = dealsByStage(key)

            return (
              <div key={key} className="flex-shrink-0 w-72">
                <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-3 transition-all hover:border-white/20">
                  {/* Column header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
                      <h3 className="text-sm font-semibold text-white">{label}</h3>
                    </div>
                    <Badge variant="secondary" className="text-xs bg-white/10 text-white/60 border-0">
                      {count}
                    </Badge>
                  </div>

                  {/* Column value */}
                  {value > 0 && (
                    <div className="mb-3 px-3 py-1.5 bg-white/5 rounded-lg text-xs font-semibold text-white/50 flex items-center justify-between">
                      <span>Valor</span>
                      <span className="text-white">${(value / 1_000_000).toFixed(1)}M</span>
                    </div>
                  )}

                  {/* Cards */}
                  <SortableContext items={stageDeals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                    <div id={key} className="space-y-2.5 min-h-[80px]">
                      {stageDeals.map((deal) => (
                        <DealCard key={deal.id} deal={deal} onClick={() => setSelected(deal)} />
                      ))}
                    </div>
                  </SortableContext>
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

function getTemperature(stage: DealStage): string {
  const coldStages = ['PROSPECTO_IDENTIFICADO', 'SENAL_DETECTADA', 'PRIMER_CONTACTO']
  const warmStages = ['EN_SECUENCIA', 'REUNION_AGENDADA']
  const hotStages = ['PROPUESTA_ENVIADA', 'NEGOCIACION', 'GANADO']
  if (coldStages.includes(stage)) return 'frio'
  if (warmStages.includes(stage)) return 'tibio'
  if (hotStages.includes(stage)) return 'caliente'
  return 'perdido'
}
