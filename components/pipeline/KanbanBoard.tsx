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
import { Search, Filter, X, Users, Thermometer } from 'lucide-react'
import { colors, shadows } from '@/lib/design-system'
import type { DealWithRelations } from '@/types'
import { DealStage } from '@/types'

const STAGES: { key: DealStage; label: string; color: string; bg: string }[] = [
  { key: 'PROSPECTO_IDENTIFICADO', label: 'Identificado', color: colors.cold, bg: '#F8FAFC' },
  { key: 'SENAL_DETECTADA',        label: 'Señal ⚡', color: colors.warning, bg: '#FFFBEB' },
  { key: 'PRIMER_CONTACTO',        label: 'Primer Contacto', color: colors.info, bg: '#EFF6FF' },
  { key: 'EN_SECUENCIA',           label: 'En Secuencia', color: '#8B5CF6', bg: '#F5F3FF' },
  { key: 'REUNION_AGENDADA',       label: 'Reunión Agendada', color: colors.primary, bg: '#FFF0E8' },
  { key: 'PROPUESTA_ENVIADA',      label: 'Propuesta Enviada', color: '#EC4899', bg: '#FDF2F8' },
  { key: 'NEGOCIACION',            label: 'Negociación', color: colors.danger, bg: '#FEF2F2' },
  { key: 'GANADO',                 label: '🏆 Ganado', color: colors.success, bg: '#E8F5EE' },
  { key: 'PERDIDO',                label: 'Perdido', color: '#6B7280', bg: '#F3F4F6' },
]

export function KanbanBoard() {
  const [deals, setDeals] = useState<DealWithRelations[]>([])
  const [teamMembers, setTeamMembers] = useState<{id: string, name: string}[]>([])
  const [selected, setSelected] = useState<DealWithRelations | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterAssignedTo, setFilterAssignedTo] = useState<string>('')
  const [filterTemperature, setFilterTemperature] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)
        
        const [dealsRes, teamRes] = await Promise.all([
          fetch('/api/deals'),
          fetch('/api/team')
        ])
        
        if (!dealsRes.ok) {
          throw new Error(`Error cargando deals: ${dealsRes.status}`)
        }
        if (!teamRes.ok) {
          throw new Error(`Error cargando equipo: ${teamRes.status}`)
        }
        
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
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ stage: targetStage }),
      })
      if (!res.ok) {
        throw new Error('API error')
      }
    } catch {
      // Revert optimistic update on failure
      setDeals(previousDeals)
    }
  }

  // Filtrar deals
  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      // Filtro por búsqueda
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchName = deal.prospect?.name?.toLowerCase().includes(q)
        const matchOrg = deal.prospect?.name?.toLowerCase().includes(q)
        const matchContact = deal.contact?.name?.toLowerCase().includes(q)
        if (!matchName && !matchOrg && !matchContact) return false
      }

      // Filtro por responsable
      if (filterAssignedTo && deal.assignedTo !== filterAssignedTo) return false

      // Filtro por temperatura
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

  return (
    <div className="space-y-4">
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Cargando pipeline...</div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-medium">Error al cargar el pipeline</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      )}
      
      {!loading && !error && (<>
      <div
        className="rounded-xl border border-[#E2E8F0] bg-white p-4 space-y-3"
        style={{ boxShadow: shadows.card }}
      >
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <Input
              placeholder="Buscar por contacto o empresa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 border-[#E2E8F0] focus-visible:ring-[#F26522]"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-[#FFF0E8] border-[#F26522]/30 text-[#F26522]'
                : 'bg-white border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtros
            {hasActiveFilters && (
              <Badge variant="secondary" className="bg-[#FFF0E8] text-[#F26522] text-xs border-0">
                Activos
              </Badge>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 pt-2 border-t border-[#E2E8F0]">
            {/* Filtro por responsable */}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#94A3B8]" />
              <select
                value={filterAssignedTo}
                onChange={(e) => setFilterAssignedTo(e.target.value)}
                className="text-sm border border-[#E2E8F0] rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#F26522]/30"
              >
                <option value="">Todos los responsables</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Filtro por temperatura */}
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-[#94A3B8]" />
              <select
                value={filterTemperature}
                onChange={(e) => setFilterTemperature(e.target.value)}
                className="text-sm border border-[#E2E8F0] rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#F26522]/30"
              >
                <option value="">Todas las temperaturas</option>
                <option value="frio">🔵 Frío</option>
                <option value="tibio">🟡 Tibio</option>
                <option value="caliente">🔴 Caliente</option>
              </select>
            </div>

            {/* Limpiar filtros */}
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setFilterAssignedTo('')
                  setFilterTemperature('')
                }}
                className="flex items-center gap-1 text-sm text-[#DC2626] hover:text-[#B91C1C] px-2"
              >
                <X className="w-3 h-3" />
                Limpiar
              </button>
            )}
          </div>
        )}

        {/* Resumen */}
        <div className="flex items-center gap-4 text-sm text-[#64748B] pt-1">
          <span className="font-medium text-[#1E293B]">{filteredDeals.length} deals</span>
          {totalValue > 0 && (
            <span>
              Valor total:{' '}
              <strong className="text-[#1A7A4A]">
                ${(totalValue / 1_000_000).toFixed(1)}M
              </strong>
            </span>
          )}
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-240px)]">
          {STAGES.map(({ key, label, color, bg }) => {
            const count = stageCount(key)
            const value = stageValue(key)
            const stageDeals = dealsByStage(key)

            return (
              <div key={key} className="flex-shrink-0 w-72">
                <div
                  className="rounded-xl border border-[#E2E8F0] p-3"
                  style={{ backgroundColor: bg }}
                >
                  {/* Header de columna */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                      <h3 className="text-sm font-semibold text-[#1E293B]">{label}</h3>
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-xs bg-white text-[#64748B] border border-[#E2E8F0]"
                    >
                      {count}
                    </Badge>
                  </div>

                  {/* Valor de la columna */}
                  {value > 0 && (
                    <div className="mb-3 px-3 py-1.5 bg-white/70 rounded-lg text-xs font-semibold text-[#64748B] flex items-center justify-between">
                      <span>Valor</span>
                      <span className="text-[#1E293B]">${(value / 1_000_000).toFixed(1)}M</span>
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
      </>)}
      
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

// Función para determinar temperatura basada en stage
function getTemperature(stage: DealStage): string {
  const coldStages = ['PROSPECTO_IDENTIFICADO', 'SENAL_DETECTADA', 'PRIMER_CONTACTO']
  const warmStages = ['EN_SECUENCIA', 'REUNION_AGENDADA']
  const hotStages = ['PROPUESTA_ENVIADA', 'NEGOCIACION', 'GANADO']

  if (coldStages.includes(stage)) return 'frio'
  if (warmStages.includes(stage)) return 'tibio'
  if (hotStages.includes(stage)) return 'caliente'
  return 'perdido'
}
