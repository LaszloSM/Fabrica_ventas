'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Search, Plus, MapPin, Building2, LayoutGrid, Table2,
  ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react'
import { colors, shadows } from '@/lib/design-system'
import { cn } from '@/lib/utils'

interface Prospect {
  id: string
  name: string
  industry?: string
  region?: string
  segment?: string
  deals?: any[]
  triggers?: any[]
}

type SortField = 'name' | 'industry' | 'region' | 'deals'
type SortDir = 'asc' | 'desc'

interface ProspectListProps {
  onCreateNew: () => void
}

export function ProspectList({ onCreateNew }: ProspectListProps) {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'cards' | 'table'>('cards')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(1)
  const pageSize = 20

  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/prospects?search=${encodeURIComponent(search)}&limit=500`)
      const json = await res.json()
      setProspects(json.data || [])
      setLoading(false)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const sortedProspects = useMemo(() => {
    const sorted = [...prospects].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'name':
          cmp = (a.name || '').localeCompare(b.name || '')
          break
        case 'industry':
          cmp = (a.industry || '').localeCompare(b.industry || '')
          break
        case 'region':
          cmp = (a.region || '').localeCompare(b.region || '')
          break
        case 'deals':
          cmp = (a.deals?.length || 0) - (b.deals?.length || 0)
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [prospects, sortField, sortDir])

  const totalPages = Math.ceil(sortedProspects.length / pageSize)
  const paginated = sortedProspects.slice((page - 1) * pageSize, page * pageSize)

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-[#94A3B8]" />
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-[#F26522]" /> : <ArrowDown className="w-3 h-3 text-[#F26522]" />
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <Input
            placeholder="Buscar prospectos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-[#E2E8F0] focus-visible:ring-[#F26522]/30"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-[#E2E8F0] bg-white overflow-hidden">
            <button
              onClick={() => setView('cards')}
              className={cn(
                'px-3 py-2 text-sm flex items-center gap-1.5 transition-colors',
                view === 'cards' ? 'bg-[#FFF0E8] text-[#F26522]' : 'text-[#64748B] hover:bg-[#F8FAFC]'
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              Tarjetas
            </button>
            <button
              onClick={() => setView('table')}
              className={cn(
                'px-3 py-2 text-sm flex items-center gap-1.5 transition-colors',
                view === 'table' ? 'bg-[#FFF0E8] text-[#F26522]' : 'text-[#64748B] hover:bg-[#F8FAFC]'
              )}
            >
              <Table2 className="w-4 h-4" />
              Tabla
            </button>
          </div>
          <Button onClick={onCreateNew} className="bg-[#F26522] hover:bg-[#D5551A]">
            <Plus className="w-4 h-4 mr-1.5" /> Nuevo
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#F26522] border-t-transparent" />
          <p className="text-sm text-[#94A3B8] mt-2">Cargando...</p>
        </div>
      ) : (
        <>
          {view === 'cards' ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {paginated.map((p) => (
                <Link key={p.id} href={`/prospects/${p.id}`}>
                  <div
                    className="rounded-xl border border-[#E2E8F0] bg-white p-4 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                    style={{ boxShadow: shadows.card }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-[#1E293B] truncate">{p.name}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-[#64748B]">
                          {p.industry && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {p.industry}
                            </span>
                          )}
                          {p.region && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {p.region}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        {(p.deals?.length ?? 0) > 0 && (
                          <Badge variant="secondary" className="text-[10px] bg-[#E8F5EE] text-[#1A7A4A] border-0">
                            {p.deals!.length} deal{(p.deals!.length ?? 0) > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {(p.triggers?.length ?? 0) > 0 && (
                          <Badge className="text-[10px] bg-[#FFFBEB] text-[#D97706] border-0">
                            ⚡ {p.triggers!.length}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {p.segment && (
                      <p className="text-[10px] text-[#94A3B8] mt-2">{p.segment}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden" style={{ boxShadow: shadows.card }}>
              <table className="w-full text-sm">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-[#64748B]">
                      <button onClick={() => toggleSort('name')} className="flex items-center gap-1">
                        Nombre <SortIcon field="name" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-[#64748B]">
                      <button onClick={() => toggleSort('industry')} className="flex items-center gap-1">
                        Industria <SortIcon field="industry" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-[#64748B]">
                      <button onClick={() => toggleSort('region')} className="flex items-center gap-1">
                        Región <SortIcon field="region" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-[#64748B]">
                      <button onClick={() => toggleSort('deals')} className="flex items-center gap-1 mx-auto">
                        Deals <SortIcon field="deals" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-[#64748B]">Señales</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((p) => (
                    <tr key={p.id} className="border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/prospects/${p.id}`} className="font-medium text-[#1E293B] hover:text-[#F26522] transition-colors">
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[#64748B]">{p.industry || '—'}</td>
                      <td className="px-4 py-3 text-[#64748B]">{p.region || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        {(p.deals?.length ?? 0) > 0 ? (
                          <span className="text-xs font-semibold text-[#1A7A4A]">{p.deals!.length}</span>
                        ) : (
                          <span className="text-xs text-[#94A3B8]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {(p.triggers?.length ?? 0) > 0 ? (
                          <span className="text-xs font-semibold text-[#D97706]">{p.triggers!.length}</span>
                        ) : (
                          <span className="text-xs text-[#94A3B8]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {paginated.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-8 w-8 text-[#E2E8F0] mb-2" />
              <p className="text-sm text-[#94A3B8]">No hay prospectos. ¡Crea el primero!</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-[#94A3B8]">
                Mostrando {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, sortedProspects.length)} de {sortedProspects.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-8 w-8 p-0 text-[#64748B]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs text-[#64748B] px-2">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="h-8 w-8 p-0 text-[#64748B]"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
