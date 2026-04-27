import React, { useState } from 'react'
import { Search, ChevronLeft, ChevronRight, Plus, MoreVertical } from 'lucide-react'

export interface Column<T> {
  label: string
  key: keyof T
  render?: (val: any, row: T) => React.ReactNode
}

interface Props<T> {
  title: string
  subtitle: string
  data: T[]
  columns: Column<T>[]
  onRowClick?: (row: T) => void
  onAdd?: () => void
  addLabel?: string
  loading?: boolean
}

const PAGE_SIZE = 20

export function DataTable<T extends { id: string }>({
  title, subtitle, data, columns, onRowClick, onAdd, addLabel = 'Añadir', loading
}: Props<T>) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const filtered = search
    ? data.filter(row =>
        Object.values(row as Record<string, unknown>).some(v =>
          String(v ?? '').toLowerCase().includes(search.toLowerCase())
        )
      )
    : data

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="flex flex-col gap-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-on-surface">{title}</h2>
          <p className="text-on-surface-variant mt-1">{subtitle}</p>
        </div>
        {onAdd && (
          <button
            onClick={onAdd}
            className="bg-brand-primary-container text-white py-2 px-6 rounded-lg font-bold flex items-center gap-2 shadow-sm hover:bg-brand-primary transition-colors"
          >
            <Plus size={18} /> {addLabel}
          </button>
        )}
      </header>

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-outline-variant flex gap-4 bg-surface-container-low/20">
          <div className="relative w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Buscar..."
              className="pl-10 pr-4 py-1.5 w-full bg-white border border-outline-variant rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary-container"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low text-[10px] font-bold text-on-surface-variant uppercase tracking-widest border-b border-outline-variant">
                {columns.map((col, i) => (
                  <th key={i} className="px-6 py-4">{col.label}</th>
                ))}
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-6 py-12 text-center text-on-surface-variant text-sm">
                    Cargando...
                  </td>
                </tr>
              ) : slice.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-6 py-12 text-center text-on-surface-variant text-sm">
                    Sin registros
                  </td>
                </tr>
              ) : slice.map((row, i) => (
                <tr
                  key={(row as any).id ?? i}
                  onClick={() => onRowClick?.(row)}
                  className={`hover:bg-surface-container-low/20 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((col, j) => (
                    <td key={j} className="px-6 py-4">
                      {col.render
                        ? col.render((row as any)[col.key], row)
                        : <span className="text-sm text-on-surface">{String((row as any)[col.key] ?? '')}</span>
                      }
                    </td>
                  ))}
                  <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                    <button className="text-on-surface-variant hover:text-brand-primary-container p-2 transition-colors">
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-outline-variant flex justify-between items-center">
          <span className="text-xs text-on-surface-variant">
            Mostrando {slice.length} de {filtered.length} registros
          </span>
          {totalPages > 1 && (
            <div className="flex gap-1 items-center">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 text-xs font-bold text-on-surface-variant">{page}/{totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
