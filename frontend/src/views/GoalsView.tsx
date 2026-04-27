import React, { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Target } from 'lucide-react'
import { api } from '../lib/api'

const SERVICE_LABELS: Record<string, string> = {
  CREDIMPACTO_GRUPOS: 'CredImpacto Grupos',
  CREDIMPACTO_FONDO_ROTATORIO: 'Fondo Rotatorio',
  CREDIMPACTO_CREDITOS: 'CredImpacto Créditos',
  CREDIMPACTO_PROVEEDORES: 'Proveedores',
  ACADEMIA_CURSO: 'Academia Curso',
  CONSULTORIA_PROYECTO: 'Consultoría',
  FUNDACION_CONVENIO: 'Fundación Convenio',
  FUNDACION_CONVOCATORIA: 'Convocatoria',
  FUNDACION_FUNDRAISING: 'Fundraising',
  FUNDACION_EXPERIENCIA: 'Experiencia',
}

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

export function GoalsView() {
  const [goals, setGoals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/metrics').then(d => {
      if (d) setGoals(d.data?.goals ?? [])
      setLoading(false)
    })
  }, [])

  const totalTarget = goals.reduce((s, g) => s + (g.targetValue ?? 0), 0)
  const totalCurrent = goals.reduce((s, g) => s + (g.currentValue ?? 0), 0)
  const totalPipeline = goals.reduce((s, g) => s + (g.pipelineValue ?? 0), 0)
  const overallPct = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0
  const pipelinePct = totalTarget > 0 ? Math.round((totalPipeline / totalTarget) * 100) : 0

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h2 className="text-3xl font-bold text-on-surface">Metas de Impacto</h2>
        <p className="text-on-surface-variant mt-1">KPIs y OKRs por unidad de negocio.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="glass-card p-6">
          <div className="text-xs font-bold text-on-surface-variant uppercase mb-1">Meta Total</div>
          <div className="text-2xl font-bold">{fmt(totalTarget)}</div>
        </div>
        <div className="glass-card p-6">
          <div className="text-xs font-bold text-on-surface-variant uppercase mb-1">Ganado</div>
          <div className="text-2xl font-bold text-green-600">{fmt(totalCurrent)}</div>
        </div>
        <div className="glass-card p-6">
          <div className="text-xs font-bold text-on-surface-variant uppercase mb-1">Pipeline Activo</div>
          <div className="text-2xl font-bold text-blue-600">{fmt(totalPipeline)}</div>
        </div>
        <div className="glass-card p-6">
          <div className="text-xs font-bold text-on-surface-variant uppercase mb-1">Avance Pipeline</div>
          <div className="text-2xl font-bold text-brand-primary-container">{pipelinePct}%</div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-on-surface-variant">Cargando metas...</div>
      ) : goals.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Target size={48} className="mx-auto text-outline mb-4" />
          <p className="text-on-surface-variant font-medium">No hay metas configuradas para este período.</p>
          <p className="text-sm text-on-surface-variant mt-2">Las metas se configuran desde el panel de administración.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-outline-variant">
            <h3 className="font-bold text-lg">Metas por Unidad de Negocio</h3>
          </div>
          <div className="divide-y divide-outline-variant">
            {goals.map((goal, i) => {
              const pct = goal.targetValue > 0
                ? Math.round((goal.currentValue / goal.targetValue) * 100)
                : 0
              return (
                <div key={goal.id ?? i} className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-bold text-sm text-on-surface">
                        {SERVICE_LABELS[goal.serviceType] ?? goal.serviceType}
                      </div>
                      <div className="text-xs text-on-surface-variant mt-0.5">
                        {goal.quarter} {goal.year} • {goal.region ?? 'Global'}
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${
                      pct >= 100 ? 'text-green-600' : pct >= 60 ? 'text-brand-primary-container' : 'text-crm-error'
                    }`}>
                      {pct}%
                    </span>
                  </div>
                  {/* Pipeline bar (light) */}
                  <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden relative">
                    {/* Pipeline progress (blue-light) */}
                    {goal.pipelineValue > 0 && (
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(Math.round((goal.pipelineValue / goal.targetValue) * 100), 100)}%` }}
                        transition={{ duration: 0.6, delay: i * 0.05 }}
                        className="absolute inset-y-0 left-0 bg-blue-200 rounded-full"
                      />
                    )}
                    {/* Won progress (solid) */}
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(pct, 100)}%` }}
                      transition={{ duration: 0.8, delay: i * 0.05 + 0.1 }}
                      className={`absolute inset-y-0 left-0 rounded-full ${pct >= 100 ? 'bg-green-500' : 'bg-brand-primary-container'}`}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-on-surface-variant mt-2">
                    <span>
                      Ganado: {fmt(goal.currentValue ?? 0)}
                      {(goal.pipelineValue ?? 0) > 0 && (
                        <span className="text-blue-500 ml-2">· Pipeline: {fmt(goal.pipelineValue)}</span>
                      )}
                    </span>
                    <span>Meta: {fmt(goal.targetValue ?? 0)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
