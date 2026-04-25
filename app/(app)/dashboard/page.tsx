'use client'

import { useEffect, useState } from 'react'
import {
  FileSpreadsheet, FileText, TrendingUp, TrendingDown,
  DollarSign, Target, Users, AlertTriangle, Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FunnelChart } from '@/components/dashboard/FunnelChart'
import { GoalProgressCard } from '@/components/dashboard/GoalProgressCard'
import { QuarterlyGrid } from '@/components/dashboard/QuarterlyGrid'
import { TeamLeaderboard } from '@/components/dashboard/TeamLeaderboard'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { UrgentActions } from '@/components/dashboard/UrgentActions'

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<any>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/metrics')
      .then((r) => r.json())
      .then((json) => setMetrics(json.data))
      .catch(() => setError(true))
  }, [])

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center backdrop-blur-sm">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-400 mb-2" />
          <p className="text-red-400 font-medium">Error cargando métricas</p>
          <p className="text-sm text-red-300/60 mt-1">Verifica que el backend esté corriendo</p>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex items-center gap-3 text-white/40">
          <Activity className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">Cargando métricas...</span>
        </div>
      </div>
    )
  }

  const summary = metrics.summary || {}
  const totalGoalsTarget = metrics.goals.reduce(
    (sum: number, g: any) => sum + (g.targetValue || 0),
    0
  )
  const pipelinePercent = totalGoalsTarget > 0
    ? (summary.totalPipeline / totalGoalsTarget) * 100
    : 0

  return (
    <div className="space-y-6 p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-white">Dashboard</h1>
          <p className="mt-0.5 text-[13px] text-white/40">Estado actual de la estrategia de ventas</p>
        </div>
        <div className="flex gap-2">
          <a href="/api/reports/pipeline" download>
            <Button
              variant="outline"
              className="flex items-center gap-2 text-[13px] text-emerald-400 border-emerald-400/20 bg-white/[0.03] hover:bg-emerald-400/[0.08] hover:text-emerald-300 h-8 px-3"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Excel
            </Button>
          </a>
          <a href="/api/reports/quarterly?quarter=2&year=2026" download>
            <Button
              variant="outline"
              className="flex items-center gap-2 text-[13px] text-blue-400 border-blue-400/20 bg-white/[0.03] hover:bg-blue-400/[0.08] hover:text-blue-300 h-8 px-3"
            >
              <FileText className="w-3.5 h-3.5" />
              Reporte Q2
            </Button>
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Pipeline Total"
          value={`$${(summary.totalPipeline / 1_000_000).toFixed(1)}M`}
          subtitle={`${summary.totalDeals || 0} deals activos`}
          icon={DollarSign}
          color="primary"
        />
        <KpiCard
          title="Deals Ganados"
          value={summary.won || 0}
          subtitle="Este año"
          icon={Target}
          color="success"
          trend="up"
          trendValue="12%"
        />
        <KpiCard
          title="Deals Perdidos"
          value={summary.lost || 0}
          subtitle="Este año"
          icon={TrendingDown}
          color="danger"
          trend="down"
          trendValue="5%"
        />
        <KpiCard
          title="Equipo Activo"
          value={metrics.leaderboard?.length || 0}
          subtitle="Vendedores con pipeline"
          icon={Users}
          color="info"
        />
      </div>

      {/* Pipeline Progress */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-[13px] font-semibold text-white">Progreso hacia meta anual</h2>
            <p className="text-[11px] text-white/35 mt-0.5">
              ${(summary.totalPipeline / 1_000_000).toFixed(1)}M de ${(totalGoalsTarget / 1_000_000).toFixed(1)}M
            </p>
          </div>
          <span className="text-lg font-bold text-[#f26522] tabular-nums">{Math.round(pipelinePercent)}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.07]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#f26522] to-[#c44e18] transition-all duration-700"
            style={{ width: `${Math.min(pipelinePercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Goals Grid */}
      <div>
        <h2 className="mb-4 text-[14px] font-semibold text-white">Metas del Trimestre</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {metrics.goals.map((goal: any) => (
            <GoalProgressCard key={goal.id} goal={goal} />
          ))}
        </div>
      </div>

      {/* Middle section: Funnel + Leaderboard + Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-5">
          <h2 className="mb-4 text-[13px] font-semibold text-white">Embudo de Conversión</h2>
          <FunnelChart data={metrics.funnel} />
        </div>

        <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-5">
          <h2 className="mb-4 text-[13px] font-semibold text-white">Ranking del Equipo</h2>
          <TeamLeaderboard data={metrics.leaderboard} />
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-5">
            <h2 className="mb-4 text-[13px] font-semibold text-white">Próximas Acciones Urgentes</h2>
            <UrgentActions />
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-5">
            <h2 className="mb-4 text-[13px] font-semibold text-white">Actividad Reciente</h2>
            <RecentActivity />
          </div>
        </div>
      </div>

      {/* Quarterly Grid */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-5">
        <h2 className="mb-4 text-[13px] font-semibold text-white">Avance Trimestral por Servicio</h2>
        <QuarterlyGrid goals={metrics.goals} />
      </div>
    </div>
  )
}
