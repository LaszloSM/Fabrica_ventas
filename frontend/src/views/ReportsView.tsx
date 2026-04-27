import React, { useState } from 'react'
import { Download, TrendingUp, BarChart3 } from 'lucide-react'

export function ReportsView() {
  const [loading, setLoading] = useState<string | null>(null)

  const download = async (type: 'pipeline' | 'quarterly') => {
    setLoading(type)
    try {
      const res = await fetch(`/api/reports/${type}`, { credentials: 'include' })
      if (!res.ok) { console.error('Export failed'); return }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte-${type}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } finally {
      setLoading(null)
    }
  }

  const reports = [
    {
      id: 'pipeline' as const,
      title: 'Reporte de Pipeline',
      desc: 'Exporta todas las oportunidades activas con su etapa, valor y responsable.',
      icon: TrendingUp,
      color: 'text-blue-600',
    },
    {
      id: 'quarterly' as const,
      title: 'Reporte Trimestral',
      desc: 'Análisis de metas vs. resultados por unidad de negocio y región.',
      icon: BarChart3,
      color: 'text-orange-500',
    },
  ]

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h2 className="text-3xl font-bold text-on-surface">Generador de Reportes</h2>
        <p className="text-on-surface-variant mt-1">Exporta y analiza los datos de tu pipeline de impacto.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map(r => (
          <div key={r.id} className="glass-card p-8 flex flex-col gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-surface-container rounded-xl">
                <r.icon size={24} className={r.color} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-on-surface">{r.title}</h3>
                <p className="text-sm text-on-surface-variant mt-1">{r.desc}</p>
              </div>
            </div>
            <button
              onClick={() => download(r.id)}
              disabled={loading === r.id}
              className="w-full py-3 bg-brand-primary-container text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-brand-primary transition-colors disabled:opacity-50"
            >
              <Download size={18} />
              {loading === r.id ? 'Exportando...' : 'Exportar CSV'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
