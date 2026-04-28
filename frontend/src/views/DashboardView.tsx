import React, { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { TrendingUp, Activity, Trophy, Users } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

interface Props { onDealClick: (id: string) => void }

export function DashboardView({ onDealClick }: Props) {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/metrics').then(d => {
      if (d) setMetrics(d.data ?? d)
      setLoading(false)
    })
  }, [])

  const m = metrics ?? {}
  const summary = m.summary ?? {}
  const goals: any[] = m.goals ?? []
  const leaderboard: any[] = m.leaderboard ?? []
  const funnel: any[] = m.funnel ?? []
  const recentDeals: any[] = m.recentDeals ?? []

  const totalTarget = goals.reduce((s: number, g: any) => s + (g.targetValue ?? 0), 0)
  const totalCurrent = goals.reduce((s: number, g: any) => s + (g.currentValue ?? 0), 0)
  const completionPct = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0
  const gap = totalTarget - totalCurrent

  const stats = [
    { label: 'Pipeline Total', value: loading ? '...' : fmt(summary.totalPipeline ?? 0), icon: TrendingUp, color: 'text-blue-600' },
    { label: 'Deals Activos', value: loading ? '...' : String(summary.totalDeals ?? 0), icon: Activity, color: 'text-brand-secondary-container' },
    { label: 'Avance Metas', value: loading ? '...' : `${completionPct}%`, icon: Trophy, color: 'text-brand-tertiary-container' },
    { label: 'Ganados', value: loading ? '...' : String(summary.won ?? 0), icon: Users, color: 'text-green-600' },
  ]

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h2 className="text-3xl font-bold text-on-surface">Dashboard Operativo</h2>
        <p className="text-on-surface-variant mt-1">
          Bienvenido, {user?.name ?? 'Usuario'}. Monitorea el pulso de impacto de tu organización.
        </p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{stat.label}</span>
              <stat.icon className={stat.color} size={20} />
            </div>
            <div className="text-2xl font-bold text-on-surface">{stat.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Funnel mini-chart */}
      {!loading && funnel.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="font-bold text-lg mb-4">Embudo de Pipeline</h3>
          <div className="flex gap-2 items-end overflow-x-auto pb-2">
            {funnel.filter((f: any) => f.stage !== 'PERDIDO').map((f: any) => {
              const maxCount = Math.max(...funnel.map((x: any) => x.count), 1)
              const pct = Math.round((f.count / maxCount) * 100)
              return (
                <div key={f.stage} className="flex flex-col items-center gap-1 min-w-[60px]">
                  <span className="text-xs font-bold text-on-surface">{f.count}</span>
                  <div className="w-full bg-surface-container rounded-t-md" style={{ height: 80, position: 'relative' }}>
                    <div
                      className="w-full bg-brand-primary-container rounded-t-md absolute bottom-0 transition-all"
                      style={{ height: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-on-surface-variant text-center leading-tight">{f.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Goals + Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-xl">Metas Trimestrales</h3>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex justify-between text-sm font-bold">
              <span>Avance Global</span>
              <span className="text-brand-primary-container">{completionPct}%</span>
            </div>
            <div className="w-full bg-surface-container h-4 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completionPct}%` }}
                transition={{ duration: 0.8 }}
                className="bg-brand-primary-container h-full rounded-full"
              />
            </div>
            <div className="grid grid-cols-3 gap-8 mt-8 pt-6 border-t border-outline-variant">
              <div>
                <div className="text-xs text-on-surface-variant uppercase font-bold mb-1">Logrado</div>
                <div className="text-xl font-bold">{fmt(totalCurrent)}</div>
              </div>
              <div>
                <div className="text-xs text-on-surface-variant uppercase font-bold mb-1">Meta</div>
                <div className="text-xl font-bold">{fmt(totalTarget)}</div>
              </div>
              <div>
                <div className="text-xs text-on-surface-variant uppercase font-bold mb-1">Brecha</div>
                <div className={`text-xl font-bold ${gap > 0 ? 'text-crm-error' : 'text-brand-tertiary-container'}`}>
                  {gap > 0 ? '-' : '+'}{fmt(Math.abs(gap))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="glass-card p-6 flex flex-col">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Trophy className="text-brand-secondary-container" size={20} />
            Leaderboard
          </h3>
          <div className="space-y-3 flex-1">
            {loading && <div className="text-xs text-on-surface-variant">Cargando...</div>}
            {!loading && leaderboard.length === 0 && (
              <div className="text-sm text-on-surface-variant">Sin datos aún.</div>
            )}
            {leaderboard.slice(0, 5).map((entry: any, i: number) => (
              <div key={entry.name} className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low/50">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? 'bg-yellow-100 text-yellow-700' :
                    i === 1 ? 'bg-slate-100 text-slate-600' :
                    i === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-surface-container text-on-surface-variant'
                  }`}>{i + 1}</span>
                  <div>
                    <div className="text-sm font-bold text-on-surface">{entry.name}</div>
                    <div className="text-[10px] text-on-surface-variant">{entry.deals} oportunidades</div>
                  </div>
                </div>
                <div className="text-sm font-bold text-green-600">{fmt(entry.won)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Deals */}
      {recentDeals.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-outline-variant flex justify-between items-center">
            <h3 className="font-bold text-lg">Tareas Prioritarias</h3>
          </div>
          <div className="divide-y divide-outline-variant">
            {recentDeals.slice(0, 5).map((deal: any) => (
              <div
                key={deal.id}
                onClick={() => onDealClick(deal.id)}
                className="p-4 flex items-center justify-between hover:bg-surface-container-low/20 transition-colors cursor-pointer"
              >
                <div>
                  <div className="text-sm font-bold text-on-surface">{deal.nextAction || (deal.serviceType ?? '').replace(/_/g, ' ')}</div>
                  <div className="text-xs text-on-surface-variant mt-0.5">{deal.prospectName || deal.stage}</div>
                </div>
                <span className="text-sm font-bold">
                  {deal.value != null ? fmt(deal.value) : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
