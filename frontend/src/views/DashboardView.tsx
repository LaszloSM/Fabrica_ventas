import React, { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { TrendingUp, Activity, Trophy, AlertTriangle, Plus } from 'lucide-react'
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
    api.get('/metrics').then(d => { if (d) setMetrics(d); setLoading(false) })
  }, [])

  const m = metrics ?? {}
  const alertCount = m.alerts
    ? (m.alerts.overdueDeals ?? 0) + (m.alerts.stuckDeals ?? 0) + (m.alerts.contactsWithoutActivity ?? 0)
    : 0
  const completionPct = Math.round((m.goalsCompletionRate ?? 0) * 100)
  const totalTarget = (m.goals ?? []).reduce((s: number, g: any) => s + (g.targetValue ?? 0), 0)
  const totalCurrent = (m.goals ?? []).reduce((s: number, g: any) => s + (g.currentValue ?? 0), 0)
  const gap = totalTarget - totalCurrent

  const stats = [
    { label: 'Pipeline Total', value: loading ? '...' : fmt(m.totalPipelineValue ?? 0), icon: TrendingUp, color: 'text-blue-600' },
    { label: 'Ponderado', value: loading ? '...' : fmt(m.weightedValue ?? 0), icon: Activity, color: 'text-brand-secondary-container' },
    { label: 'Metas Ganadas', value: loading ? '...' : `${completionPct}%`, icon: Trophy, color: 'text-brand-tertiary-container' },
    { label: 'Alertas', value: loading ? '...' : String(alertCount), icon: AlertTriangle, color: 'text-crm-error' },
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

      {/* Goals + Alerts */}
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

        <div className="glass-card p-6 flex flex-col">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <AlertTriangle className="text-brand-secondary-container" size={20} />
            Alertas de Gestión
          </h3>
          <div className="space-y-3 flex-1">
            {m.alerts?.overdueDeals > 0 && (
              <div className="p-4 rounded-lg border bg-red-50 border-red-200">
                <span className="text-xs font-bold text-red-700">{m.alerts.overdueDeals} Oportunidades Vencidas</span>
                <p className="text-xs text-on-surface-variant mt-1">Revisar status inmediatamente</p>
              </div>
            )}
            {m.alerts?.stuckDeals > 0 && (
              <div className="p-4 rounded-lg border bg-orange-50 border-orange-200">
                <span className="text-xs font-bold text-orange-700">{m.alerts.stuckDeals} Sin Próxima Acción</span>
                <p className="text-xs text-on-surface-variant mt-1">Oportunidades estancadas &gt;14 días</p>
              </div>
            )}
            {m.alerts?.contactsWithoutActivity > 0 && (
              <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
                <span className="text-xs font-bold text-blue-700">{m.alerts.contactsWithoutActivity} Contactos sin Interacción</span>
                <p className="text-xs text-on-surface-variant mt-1">Actualización requerida</p>
              </div>
            )}
            {!loading && !alertCount && (
              <div className="p-4 rounded-lg border bg-green-50 border-green-200">
                <span className="text-xs font-bold text-green-700">¡Sin alertas activas!</span>
                <p className="text-xs text-on-surface-variant mt-1">Todo al día</p>
              </div>
            )}
            {loading && <div className="text-xs text-on-surface-variant">Cargando...</div>}
          </div>
        </div>
      </div>

      {/* Recent Deals */}
      {(m.recentDeals?.length ?? 0) > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-outline-variant flex justify-between items-center">
            <h3 className="font-bold text-lg">Tareas Prioritarias</h3>
          </div>
          <div className="divide-y divide-outline-variant">
            {m.recentDeals.slice(0, 5).map((deal: any) => (
              <div
                key={deal.id}
                onClick={() => onDealClick(deal.id)}
                className="p-4 flex items-center justify-between hover:bg-surface-container-low/20 transition-colors cursor-pointer"
              >
                <div>
                  <div className="text-sm font-bold text-on-surface">{deal.nextAction ?? deal.stage}</div>
                  <div className="text-xs text-on-surface-variant mt-0.5">{deal.prospectName ?? deal.prospect?.name}</div>
                </div>
                <span className="text-sm font-bold">{fmt(deal.value ?? 0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
