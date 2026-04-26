'use client'

import { useEffect, useState } from 'react'
import {
  FileSpreadsheet, FileText, TrendingUp, TrendingDown,
  Target, Users, AlertTriangle, Activity, Thermometer,
  Mail, Phone, Calendar, FileText as FileTextIcon, Link2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface KpiData {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  color: string
  colorDim: string
  trend?: 'up' | 'down' | 'neutral'
  trendVal?: string
}

interface Goal {
  id: string
  serviceType: string
  currentValue: number
  targetValue: number
}

interface ActivityItem {
  id: string
  type: string
  label: string
  note?: string
  date: string
}

interface FunnelStage {
  stage: string
  label: string
  count: number
}

interface MetricsData {
  summary: {
    totalDeals: number
    won: number
    lost: number
  }
  funnel: FunnelStage[]
  goals: Goal[]
  leaderboard: any[]
}

const COLD_STAGES = new Set(['PROSPECTO_IDENTIFICADO', 'PRIMER_CONTACTO'])
const WARM_STAGES = new Set(['EN_SECUENCIA', 'SENAL_DETECTADA'])
const HOT_STAGES = new Set(['REUNION_AGENDADA', 'PROPUESTA_ENVIADA', 'NEGOCIACION'])

const SERVICE_COLORS: Record<string, string> = {
  CREDIMPACTO_GRUPOS: '#F26522',
  CREDIMPACTO_CREDITOS: '#3B82F6',
  ACADEMIA_CURSO: '#10B981',
  CONSULTORIA_PROYECTO: '#EC4899',
  FUNDACION_CONVENIO: '#8B5CF6',
}

const SERVICE_LABELS: Record<string, string> = {
  CREDIMPACTO_GRUPOS: 'Grupos Credimpacto',
  CREDIMPACTO_CREDITOS: 'Créditos Colectivos',
  ACADEMIA_CURSO: 'Cursos Academia',
  CONSULTORIA_PROYECTO: 'Consultoría',
  FUNDACION_CONVENIO: 'Convenios Fundación',
}

function GoalRow({ name, current, target, color }: { name: string; current: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0
  return (
    <div className="flex items-center gap-4 py-3 px-4 rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer group">
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 8px ${color}60` }} />
      <span className="text-[13px] font-medium text-white/70 flex-shrink-0 w-[160px] truncate">{name}</span>
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold tabular-nums flex-shrink-0" style={{ color, minWidth: 36, textAlign: 'right' }}>{pct}%</span>
      <span className="text-[11px] text-white/30 tabular-nums flex-shrink-0 w-[60px] text-right">{current}/{target}</span>
    </div>
  )
}

function ActivityFeedItem({ type, label, note, date }: ActivityItem) {
  const colors: Record<string, string> = {
    EMAIL: '#3B82F6', CALL: '#10B981', MEETING: '#F26522',
    NOTE: '#F59E0B', LINKEDIN: '#8B5CF6', WHATSAPP: '#10B981',
  }
  const icons: Record<string, LucideIcon> = {
    EMAIL: Mail, CALL: Phone, MEETING: Calendar,
    NOTE: FileTextIcon, LINKEDIN: Link2, WHATSAPP: Phone,
  }
  const c = colors[type] || '#94A3B8'
  const Icon = icons[type] || Activity

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer group">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
        style={{ background: `${c}18` }}
      >
        <Icon className="w-4 h-4" style={{ color: c }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-white/90 truncate">{label}</p>
        {note && <p className="text-xs text-white/40 mt-0.5 truncate">{note}</p>}
      </div>
      <span className="text-[10px] text-white/30 flex-shrink-0 mt-1">{date}</span>
    </div>
  )
}

function MetricCard({ kpi, index }: { kpi: KpiData; index: number }) {
  const Icon = kpi.icon
  return (
    <div
      className="group relative rounded-xl border border-white/[0.07] bg-white/[0.03] p-5 cursor-pointer overflow-hidden transition-all duration-200 hover:bg-white/[0.055] hover:border-white/[0.13] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20"
      style={{ animationDelay: `${(index + 1) * 50}ms` }}
    >
      {/* Ambient corner glow on hover */}
      <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: kpi.colorDim, filter: 'blur(30px)' }}
      />
      <div className="relative">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg mb-3.5 transition-transform duration-300 group-hover:scale-110"
          style={{ background: kpi.colorDim }}
        >
          <Icon className="w-[18px] h-[18px]" style={{ color: kpi.color }} />
        </div>
        <p className="text-[11px] font-semibold text-white/45 mb-1 uppercase tracking-wider">{kpi.title}</p>
        <p className="text-[28px] font-bold text-white tabular-nums leading-none" style={{ fontFamily: 'var(--font-dm-serif), Georgia, serif' }}>{kpi.value}</p>
        <div className="flex items-center justify-between mt-2">
          {kpi.subtitle && <p className="text-[11px] text-white/35">{kpi.subtitle}</p>}
          {kpi.trend && kpi.trendVal && (
            <span className={`text-[11px] font-semibold flex items-center gap-1 ${
              kpi.trend === 'up' ? 'text-emerald-400' : kpi.trend === 'down' ? 'text-red-400' : 'text-white/40'
            }`}>
              {kpi.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : kpi.trend === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
              {kpi.trendVal}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/metrics')
      .then((r) => r.json())
      .then((json) => setMetrics(json.data))
      .catch(() => setError(true))

    fetch('/api/activities?limit=5')
      .then((r) => r.json())
      .then((json) => {
        const items = (json.data || []).map((a: any) => ({
          id: a.id,
          type: a.type,
          label: a.prospect?.name || a.deal?.serviceType || 'Actividad',
          note: a.notes,
          date: a.doneAt ? new Date(a.doneAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : '',
        }))
        setActivities(items)
      })
      .catch(() => {})
  }, [])

  if (!metrics && error) {
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
  const funnel: FunnelStage[] = metrics.funnel || []

  const countByTemp = (stages: Set<string>) =>
    funnel.filter((f) => stages.has(f.stage)).reduce((s, f) => s + f.count, 0)

  const calientes = countByTemp(HOT_STAGES)
  const tibios = countByTemp(WARM_STAGES)
  const frios = countByTemp(COLD_STAGES)

  const kpiData: KpiData[] = [
    {
      title: 'Total Contactos',
      value: summary.totalDeals || 0,
      subtitle: 'Deals activos en pipeline',
      icon: Users,
      color: '#f26522',
      colorDim: 'rgba(242,101,34,0.12)',
    },
    {
      title: 'Calientes',
      value: calientes,
      subtitle: 'Reunión · Propuesta · Negociación',
      icon: Thermometer,
      color: '#ef4444',
      colorDim: 'rgba(239,68,68,0.12)',
    },
    {
      title: 'Tibios',
      value: tibios,
      subtitle: 'En Secuencia · Señal Detectada',
      icon: Activity,
      color: '#f59e0b',
      colorDim: 'rgba(245,158,11,0.12)',
    },
    {
      title: 'Fríos',
      value: frios,
      subtitle: 'Prospecto · Primer Contacto',
      icon: Target,
      color: '#3b82f6',
      colorDim: 'rgba(59,130,246,0.12)',
    },
  ]

  return (
    <div className="space-y-7 p-7 max-w-[1500px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold text-white/40 uppercase tracking-[0.08em] mb-1.5">Resumen</p>
          <h1 className="text-[32px] font-normal text-white leading-tight" style={{ fontFamily: 'var(--font-dm-serif), Georgia, serif' }}>Dashboard</h1>
        </div>
        <div className="flex gap-2">
          <a href="/api/reports/pipeline" download>
            <button className="flex items-center gap-2 text-[13px] text-emerald-400 border border-emerald-400/20 bg-white/[0.03] hover:bg-emerald-400/[0.08] hover:text-emerald-300 h-9 px-3.5 rounded-lg transition-all duration-200 hover:-translate-y-0.5">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Excel
            </button>
          </a>
          <a href="/api/reports/quarterly?quarter=2&year=2026" download>
            <button className="flex items-center gap-2 text-[13px] text-blue-400 border border-blue-400/20 bg-white/[0.03] hover:bg-blue-400/[0.08] hover:text-blue-300 h-9 px-3.5 rounded-lg transition-all duration-200 hover:-translate-y-0.5">
              <FileText className="w-3.5 h-3.5" />
              Reporte Q2
            </button>
          </a>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-in">
        {kpiData.map((kpi, i) => (
          <MetricCard key={kpi.title} kpi={kpi} index={i} />
        ))}
      </div>

      {/* Two-column: Goals + Activity */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Goals */}
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-sm">
          <h2 className="text-[14px] font-semibold text-white mb-3 px-1">Metas del Trimestre</h2>
          <div className="flex flex-col">
            {metrics.goals.slice(0, 6).map((goal: any) => (
              <GoalRow
                key={goal.id}
                name={SERVICE_LABELS[goal.serviceType] || goal.serviceType}
                current={goal.currentUnits || 0}
                target={goal.targetUnits || 5}
                color={SERVICE_COLORS[goal.serviceType] || '#94A3B8'}
              />
            ))}
          </div>
        </div>

        {/* Activity */}
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-sm">
          <h2 className="text-[14px] font-semibold text-white mb-3">Actividad Reciente</h2>
          <div className="flex flex-col gap-1">
            {activities.length > 0 ? activities.map((a) => (
              <ActivityFeedItem key={a.id} {...a} />
            )) : (
              <div className="text-center py-8">
                <Activity className="mx-auto h-8 w-8 text-white/10 mb-2" />
                <p className="text-sm text-white/30">No hay actividad reciente</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
