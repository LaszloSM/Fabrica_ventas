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
import type { DealWithRelations } from '@/types'
import { DealStage } from '@/types'

const STAGES: { key: DealStage; label: string; color: string }[] = [
  { key: 'PROSPECTO_IDENTIFICADO', label: 'Identificado', color: 'bg-gray-100' },
  { key: 'SENAL_DETECTADA',        label: 'Señal ⚡', color: 'bg-yellow-50' },
  { key: 'PRIMER_CONTACTO',        label: 'Primer Contacto', color: 'bg-blue-50' },
  { key: 'EN_SECUENCIA',           label: 'En Secuencia', color: 'bg-purple-50' },
  { key: 'REUNION_AGENDADA',       label: 'Reunión Agendada', color: 'bg-orange-50' },
  { key: 'PROPUESTA_ENVIADA',      label: 'Propuesta Enviada', color: 'bg-pink-50' },
  { key: 'NEGOCIACION',            label: 'Negociación', color: 'bg-indigo-50' },
  { key: 'GANADO',                 label: '🏆 Ganado', color: 'bg-green-50' },
  { key: 'PERDIDO',                label: 'Perdido', color: 'bg-red-50' },
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

  useEffect(() => {
    fetch('/api/deals').then((r) => r.json()).then((j) => setDeals(j.data || []))
    fetch('/api/team').then((r) => r.json()).then((j) => setTeamMembers(j.data || []))
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
      {/* Barra de búsqueda y filtros */}
      <div className="bg-white border rounded-lg p-4 space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por contacto o empresa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtros
            {hasActiveFilters && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                Activos
              </Badge>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 pt-2 border-t">
            {/* Filtro por responsable */}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <select
                value={filterAssignedTo}
                onChange={(e) => setFilterAssignedTo(e.target.value)}
                className="text-sm border rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Todos los responsables</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Filtro por temperatura */}
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-gray-400" />
              <select
                value={filterTemperature}
                onChange={(e) => setFilterTemperature(e.target.value)}
                className="text-sm border rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
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
                className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 px-2"
              >
                <X className="w-3 h-3" />
                Limpiar
              </button>
            )}
          </div>
        )}

        {/* Resumen */}
        <div className="flex items-center gap-4 text-sm text-gray-500 pt-1">
          <span><strong>{filteredDeals.length}</strong> deals</span>
          {totalValue > 0 && (
            <span>Valor total: <strong className="text-green-700">${(totalValue / 1_000_000).toFixed(1)}M</strong></span>
          )}
        </div>
      </div>

      {/* Kanban */}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4 min-h-[calc(100vh-240px)]">
          {STAGES.map(({ key, label, color }) => {
            const count = stageCount(key)
            const value = stageValue(key)
            const stageDeals = dealsByStage(key)
            
            return (
              <div key={key} className="flex-shrink-0 w-72">
                <div className={`${color} rounded-xl p-3 border`}>
                  {/* Header de columna */}
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="secondary" className="text-xs bg-white">
                        {count}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Valor de la columna */}
                  {value > 0 && (
                    <div className="mb-2 px-2 py-1 bg-white/60 rounded text-xs font-medium text-gray-600">
                      ${(value / 1_000_000).toFixed(1)}M
                    </div>
                  )}
                  
                  {/* Cards */}
                  <SortableContext items={stageDeals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                    <div
                      id={key}
                      className="space-y-2 min-h-[80px]"
                    >
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
        <DealDrawer deal={selected} onClose={() => setSelected(null)} onUpdate={(updated) => {
          setDeals((prev) => prev.map((d) => d.id === updated.id ? updated : d))
          setSelected(updated)
        }} />
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
