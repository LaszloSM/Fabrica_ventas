'use client'

import { useEffect, useState } from 'react'

import { FileSpreadsheet, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FunnelChart } from '@/components/dashboard/FunnelChart'
import { GoalProgressCard } from '@/components/dashboard/GoalProgressCard'
import { QuarterlyGrid } from '@/components/dashboard/QuarterlyGrid'
import { TeamLeaderboard } from '@/components/dashboard/TeamLeaderboard'

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<any>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/metrics')
      .then((r) => r.json())
      .then((json) => setMetrics(json.data))
      .catch(() => setError(true))
  }, [])

  if (error) return <div className="p-6 text-red-600">Error cargando métricas. Verifica que el backend esté corriendo.</div>
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

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Exportar Reportes</h2>
        <div className="flex gap-3">
          <a href="/api/reports/pipeline" download>
            <Button variant="outline" className="flex items-center gap-2 text-green-700 border-green-300">
              <FileSpreadsheet className="w-4 h-4" />
              Pipeline Excel
            </Button>
          </a>
          <a href="/api/reports/quarterly?quarter=2&year=2026" download>
            <Button variant="outline" className="flex items-center gap-2 text-blue-700 border-blue-300">
              <FileText className="w-4 h-4" />
              Reporte Q2 2026 PDF
            </Button>
          </a>
        </div>
      </div>
    </div>
  )
}
