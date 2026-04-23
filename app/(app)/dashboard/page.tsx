'use client'

import { useEffect, useState } from 'react'

import { FunnelChart } from '@/components/dashboard/FunnelChart'
import { GoalProgressCard } from '@/components/dashboard/GoalProgressCard'
import { QuarterlyGrid } from '@/components/dashboard/QuarterlyGrid'
import { TeamLeaderboard } from '@/components/dashboard/TeamLeaderboard'

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<any>(null)

  useEffect(() => {
    fetch('/api/metrics')
      .then((response) => response.json())
      .then((json) => setMetrics(json.data))
  }, [])

  if (!metrics) return <div className="p-6">Cargando metricas...</div>

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard - Metas 2026</h1>
          <p className="mt-1 text-gray-500">Estado actual de la estrategia de ventas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.goals.map((goal: any) => (
          <GoalProgressCard key={goal.id} goal={goal} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Embudo de Conversion</h2>
          <FunnelChart data={metrics.funnel} />
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Ranking del Equipo</h2>
          <TeamLeaderboard data={metrics.leaderboard} />
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Avance Trimestral por Servicio</h2>
        <QuarterlyGrid goals={metrics.goals} />
      </div>
    </div>
  )
}
