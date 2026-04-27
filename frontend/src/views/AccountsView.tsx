import React, { useEffect, useState } from 'react'
import { Search, Building2, TrendingUp, X, ChevronRight, MapPin, Globe, Layers } from 'lucide-react'
import { api } from '../lib/api'

const STAGE_LABELS: Record<string, string> = {
  PROSPECTO_IDENTIFICADO: 'Prospecto', SENAL_DETECTADA: 'Señal',
  PRIMER_CONTACTO: 'Primer Contacto', EN_SECUENCIA: 'En Secuencia',
  REUNION_AGENDADA: 'Reunión', PROPUESTA_ENVIADA: 'Propuesta',
  NEGOCIACION: 'Negociación', GANADO: 'Ganado', PERDIDO: 'Perdido',
}

const STAGE_COLOR: Record<string, string> = {
  GANADO: 'bg-green-50 text-green-700', PERDIDO: 'bg-red-50 text-red-600',
  NEGOCIACION: 'bg-orange-50 text-orange-700',
}

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

function AccountDetail({ account, onClose, onDealClick }: {
  account: any
  onClose: () => void
  onDealClick?: (id: string) => void
}) {
  const [deals, setDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/prospects/${account.id}`).then(d => {
      if (d?.data?.deals) setDeals(d.data.deals)
      setLoading(false)
    })
  }, [account.id])

  const pipeline = deals.reduce((s: number, d: any) => s + (d.value ?? 0), 0)
  const won = deals.filter((d: any) => d.stage === 'GANADO')
  const active = deals.filter((d: any) => !['GANADO', 'PERDIDO'].includes(d.stage))

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-outline-variant flex items-center justify-between bg-brand-primary-container/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white border border-outline-variant flex items-center justify-center shadow-sm">
              <Building2 size={22} className="text-brand-primary-container" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-on-surface">{account.name}</h3>
              <span className="text-xs text-on-surface-variant">{account.industry ?? 'Sin industria'}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-px bg-outline-variant">
          {[
            { label: 'Pipeline', value: fmt(pipeline) },
            { label: 'Activos', value: String(active.length) },
            { label: 'Ganados', value: String(won.length) },
          ].map(k => (
            <div key={k.label} className="bg-white p-4 text-center">
              <div className="text-xs text-on-surface-variant uppercase font-bold mb-1">{k.label}</div>
              <div className="text-lg font-bold text-on-surface">{k.value}</div>
            </div>
          ))}
        </div>

        {/* Meta */}
        <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-low/30">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {account.region && (
              <div className="flex items-center gap-2 text-on-surface-variant">
                <MapPin size={14} /> <span>{account.region}</span>
              </div>
            )}
            {account.segment && (
              <div className="flex items-center gap-2 text-on-surface-variant">
                <Layers size={14} /> <span>{account.segment}</span>
              </div>
            )}
            {account.website && (
              <div className="flex items-center gap-2 text-on-surface-variant col-span-2">
                <Globe size={14} />
                <a href={account.website} target="_blank" rel="noopener noreferrer" className="text-brand-primary-container underline text-xs">
                  {account.website}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Deals list */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 border-b border-outline-variant">
            <h4 className="font-bold text-sm text-on-surface">Oportunidades ({deals.length})</h4>
          </div>
          {loading ? (
            <div className="py-8 text-center text-sm text-on-surface-variant">Cargando...</div>
          ) : deals.length === 0 ? (
            <div className="py-8 text-center text-sm text-on-surface-variant">Sin oportunidades registradas.</div>
          ) : (
            <div className="divide-y divide-outline-variant">
              {deals.map((deal: any) => (
                <div
                  key={deal.id ?? deal._id}
                  onClick={() => onDealClick?.(deal.id ?? deal._id)}
                  className="p-4 flex items-center justify-between hover:bg-surface-container-low/30 transition-colors cursor-pointer"
                >
                  <div>
                    <div className="text-sm font-bold text-on-surface">
                      {(deal.serviceType ?? '').replace(/_/g, ' ')}
                    </div>
                    <div className={`text-[10px] font-bold mt-0.5 px-2 py-0.5 rounded-full inline-block ${STAGE_COLOR[deal.stage] ?? 'bg-blue-50 text-blue-700'}`}>
                      {STAGE_LABELS[deal.stage] ?? deal.stage}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold">{fmt(deal.value ?? 0)}</span>
                    <ChevronRight size={14} className="text-on-surface-variant" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const PAGE_SIZE = 20

export function AccountsView({ onDealClick }: { onDealClick?: (id: string) => void }) {
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => {
    const q = search ? `&search=${encodeURIComponent(search)}` : ''
    api.get(`/prospects?limit=100${q}`).then(d => {
      if (d) setAccounts(Array.isArray(d) ? d : d.data ?? [])
      setLoading(false)
    })
  }, [search])

  const totalPages = Math.max(1, Math.ceil(accounts.length / PAGE_SIZE))
  const slice = accounts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="flex flex-col gap-6">
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-on-surface">Directorio de Cuentas</h2>
          <p className="text-on-surface-variant mt-1">
            Empresas e instituciones con las que CoimpactoB tiene relaciones comerciales.
            Haz clic en una cuenta para ver sus oportunidades y pipeline.
          </p>
        </div>
      </header>

      <div className="glass-card overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b border-outline-variant bg-surface-container-low/20 flex gap-3 items-center">
          <div className="relative w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Buscar cuenta..."
              className="pl-9 pr-4 py-1.5 w-full bg-white border border-outline-variant rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary-container"
            />
          </div>
          <span className="text-xs text-on-surface-variant">{accounts.length} cuentas</span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low text-[10px] font-bold text-on-surface-variant uppercase tracking-widest border-b border-outline-variant">
                <th className="px-6 py-4">Cuenta</th>
                <th className="px-6 py-4">Industria</th>
                <th className="px-6 py-4">Región</th>
                <th className="px-6 py-4">Segmento</th>
                <th className="px-6 py-4 text-center">Oportunidades</th>
                <th className="px-6 py-4 text-right">Pipeline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-on-surface-variant">Cargando...</td></tr>
              ) : slice.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-on-surface-variant">Sin registros</td></tr>
              ) : slice.map((acc, i) => {
                const dealCount = Array.isArray(acc.deals) ? acc.deals.length : 0
                // Pipeline not yet available from list endpoint (would need enrichment)
                return (
                  <tr
                    key={acc.id ?? i}
                    onClick={() => setSelected(acc)}
                    className="hover:bg-surface-container-low/20 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-primary-container/10 flex items-center justify-center shrink-0">
                          <Building2 size={14} className="text-brand-primary-container" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-brand-primary-container">{acc.name}</div>
                          {acc.website && <div className="text-[10px] text-on-surface-variant truncate max-w-[160px]">{acc.website}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">{acc.industry ?? '—'}</td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">{acc.region ?? '—'}</td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">{acc.segment ?? '—'}</td>
                    <td className="px-6 py-4 text-center">
                      {dealCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-[10px] font-bold">
                          <TrendingUp size={10} />
                          {dealCount}
                        </span>
                      ) : (
                        <span className="text-xs text-on-surface-variant">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ChevronRight size={14} className="text-on-surface-variant ml-auto" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-outline-variant flex justify-between items-center">
          <span className="text-xs text-on-surface-variant">Mostrando {slice.length} de {accounts.length}</span>
          {totalPages > 1 && (
            <div className="flex gap-1 items-center">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="px-3 py-1 border border-outline-variant rounded-lg text-xs hover:bg-surface-container disabled:opacity-40">
                ‹ Anterior
              </button>
              <span className="px-3 text-xs font-bold">{page}/{totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="px-3 py-1 border border-outline-variant rounded-lg text-xs hover:bg-surface-container disabled:opacity-40">
                Siguiente ›
              </button>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <AccountDetail
          account={selected}
          onClose={() => setSelected(null)}
          onDealClick={id => { setSelected(null); onDealClick?.(id) }}
        />
      )}
    </div>
  )
}
