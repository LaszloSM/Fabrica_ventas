'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  Search, Plus, MapPin, Building2, LayoutGrid, Table2,
  ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react'
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
  const pageSize = 21

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
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-white/30" />
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-[#f26522]" /> : <ArrowDown className="w-3 h-3 text-[#f26522]" />
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-[400px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            placeholder="Buscar prospectos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-[42px] pl-10 pr-4 rounded-lg border border-white/[0.08] bg-white/[0.035] text-white text-sm placeholder:text-white/30 outline-none transition-all focus:border-[#f26522]/40 focus:ring-2 focus:ring-[#f26522]/10"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-white/[0.08] bg-white/[0.035] overflow-hidden">
            <button
              onClick={() => setView('cards')}
              className={cn(
                'px-3 py-2 text-[13px] flex items-center gap-1.5 transition-all duration-150',
                view === 'cards' ? 'bg-[#f26522]/15 text-[#f26522]' : 'text-white/50 hover:bg-white/[0.04]'
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              Tarjetas
            </button>
            <button
              onClick={() => setView('table')}
              className={cn(
                'px-3 py-2 text-[13px] flex items-center gap-1.5 transition-all duration-150',
                view === 'table' ? 'bg-[#f26522]/15 text-[#f26522]' : 'text-white/50 hover:bg-white/[0.04]'
              )}
            >
              <Table2 className="w-4 h-4" />
              Tabla
            </button>
          </div>
          {/* New button */}
          <button
            onClick={onCreateNew}
            className="flex items-center gap-1.5 h-[40px] px-5 rounded-lg text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(135deg, #f26522, #c44e18)',
              boxShadow: '0 4px 16px rgba(242,101,34,0.2)',
            }}
          >
            <Plus className="w-4 h-4" /> Nuevo
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#f26522] border-t-transparent" />
          <p className="text-sm text-white/40 mt-3">Cargando prospectos...</p>
        </div>
      ) : (
        <>
          {view === 'cards' ? (
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {paginated.map((p) => (
                <Link key={p.id} href={`/prospects/${p.id}`}>
                  <div className="group relative rounded-xl border border-white/[0.07] bg-white/[0.03] p-[18px] transition-all duration-200 hover:bg-white/[0.055] hover:border-white/[0.13] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 cursor-pointer overflow-hidden">
                    {/* Ambient glow on hover */}
                    <div className="absolute -top-8 -left-8 w-20 h-20 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ background: 'rgba(242,101,34,0.06)', filter: 'blur(40px)' }}
                    />
                    <div className="relative">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-[15px] font-semibold text-white truncate group-hover:text-[#f26522] transition-colors duration-200">{p.name}</h3>
                          <div className="flex flex-wrap items-center gap-2.5 mt-2 text-xs text-white/50">
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
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0 ml-3">
                          {(p.deals?.length ?? 0) > 0 && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                              {p.deals!.length} deal{(p.deals!.length ?? 0) > 1 ? 's' : ''}
                            </span>
                          )}
                          {(p.triggers?.length ?? 0) > 0 && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
                              ⚡ {p.triggers!.length}
                            </span>
                          )}
                        </div>
                      </div>
                      {p.segment && (
                        <p className="text-[11px] text-white/30 mt-2.5">{p.segment}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] overflow-hidden">
              <table className="w-full text-[13px]">
                <thead className="bg-white/[0.03] border-b border-white/[0.07]">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium text-white/50">
                      <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-white/70 transition-colors">
                        Nombre <SortIcon field="name" />
                      </button>
                    </th>
                    <th className="px-5 py-3 text-left font-medium text-white/50">
                      <button onClick={() => toggleSort('industry')} className="flex items-center gap-1 hover:text-white/70 transition-colors">
                        Industria <SortIcon field="industry" />
                      </button>
                    </th>
                    <th className="px-5 py-3 text-left font-medium text-white/50">
                      <button onClick={() => toggleSort('region')} className="flex items-center gap-1 hover:text-white/70 transition-colors">
                        Región <SortIcon field="region" />
                      </button>
                    </th>
                    <th className="px-5 py-3 text-center font-medium text-white/50">
                      <button onClick={() => toggleSort('deals')} className="flex items-center gap-1 mx-auto hover:text-white/70 transition-colors">
                        Deals <SortIcon field="deals" />
                      </button>
                    </th>
                    <th className="px-5 py-3 text-center font-medium text-white/50">Señales</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((p) => (
                    <tr key={p.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.04] transition-colors">
                      <td className="px-5 py-3">
                        <Link href={`/prospects/${p.id}`} className="font-medium text-white hover:text-[#f26522] transition-colors">
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-white/50">{p.industry || '—'}</td>
                      <td className="px-5 py-3 text-white/50">{p.region || '—'}</td>
                      <td className="px-5 py-3 text-center">
                        {(p.deals?.length ?? 0) > 0 ? (
                          <span className="text-xs font-semibold text-emerald-400">{p.deals!.length}</span>
                        ) : (
                          <span className="text-xs text-white/30">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {(p.triggers?.length ?? 0) > 0 ? (
                          <span className="text-xs font-semibold text-amber-400">{p.triggers!.length}</span>
                        ) : (
                          <span className="text-xs text-white/30">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {paginated.length === 0 && (
            <div className="text-center py-16">
              <Building2 className="mx-auto h-10 w-10 text-white/10 mb-3" />
              <p className="text-sm text-white/40">No hay prospectos que coincidan</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-white/40">
                Mostrando {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, sortedProspects.length)} de {sortedProspects.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-white/50 px-2">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
