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
import { colors, shadows } from '@/lib/design-system'

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
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-500 mb-2" />
          <p className="text-red-700 font-medium">Error cargando métricas</p>
          <p className="text-sm text-red-600 mt-1">Verifica que el backend esté corriendo</p>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex items-center gap-3 text-[#64748B]">
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
          <h1 className="text-2xl font-bold text-[#1E293B]">Dashboard</h1>
          <p className="mt-1 text-sm text-[#64748B]">Estado actual de la estrategia de ventas</p>
        </div>
        <div className="flex gap-2">
          <a href="/api/reports/pipeline" download>
            <Button
              variant="outline"
              className="flex items-center gap-2 text-[#1A7A4A] border-[#1A7A4A]/30 hover:bg-[#1A7A4A]/5"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Pipeline Excel
            </Button>
          </a>
          <a href="/api/reports/quarterly?quarter=2&year=2026" download>
            <Button
              variant="outline"
              className="flex items-center gap-2 text-[#2563EB] border-[#2563EB]/30 hover:bg-[#2563EB]/5"
            >
              <FileText className="w-4 h-4" />
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
      <div
        className="rounded-xl border border-[#E2E8F0] bg-white p-5"
        style={{ boxShadow: shadows.card }}
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-sm font-semibold text-[#1E293B]">Progreso hacia meta anual</h2>
            <p className="text-xs text-[#94A3B8]">
              ${(summary.totalPipeline / 1_000_000).toFixed(1)}M de ${(totalGoalsTarget / 1_000_000).toFixed(1)}M
            </p>
          </div>
          <span className="text-sm font-bold text-[#F26522]">{Math.round(pipelinePercent)}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
          <div
            className="h-full rounded-full bg-[#F26522] transition-all duration-700"
            style={{ width: `${Math.min(pipelinePercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Goals Grid */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-[#1E293B]">Metas del Trimestre</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {metrics.goals.map((goal: any) => (
            <GoalProgressCard key={goal.id} goal={goal} />
          ))}
        </div>
      </div>

      {/* Middle section: Funnel + Leaderboard + Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div
          className="rounded-xl border border-[#E2E8F0] bg-white p-6"
          style={{ boxShadow: shadows.card }}
        >
          <h2 className="mb-4 text-lg font-semibold text-[#1E293B]">Embudo de Conversión</h2>
          <FunnelChart data={metrics.funnel} />
        </div>

        <div
          className="rounded-xl border border-[#E2E8F0] bg-white p-6"
          style={{ boxShadow: shadows.card }}
        >
          <h2 className="mb-4 text-lg font-semibold text-[#1E293B]">Ranking del Equipo</h2>
          <TeamLeaderboard data={metrics.leaderboard} />
        </div>

        <div className="space-y-6">
          <div
            className="rounded-xl border border-[#E2E8F0] bg-white p-6"
            style={{ boxShadow: shadows.card }}
          >
            <h2 className="mb-4 text-lg font-semibold text-[#1E293B]">Próximas Acciones Urgentes</h2>
            <UrgentActions />
          </div>

          <div
            className="rounded-xl border border-[#E2E8F0] bg-white p-6"
            style={{ boxShadow: shadows.card }}
          >
            <h2 className="mb-4 text-lg font-semibold text-[#1E293B]">Actividad Reciente</h2>
            <RecentActivity />
          </div>
        </div>
      </div>

      {/* Quarterly Grid */}
      <div
        className="rounded-xl border border-[#E2E8F0] bg-white p-6"
        style={{ boxShadow: shadows.card }}
      >
        <h2 className="mb-4 text-lg font-semibold text-[#1E293B]">Avance Trimestral por Servicio</h2>
        <QuarterlyGrid goals={metrics.goals} />
      </div>
    </div>
  )
}
