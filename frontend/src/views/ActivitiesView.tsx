import React, { useEffect, useState } from 'react'
import { Mail, Phone, Video, FileText, MessageSquare, Linkedin } from 'lucide-react'
import { DataTable, Column } from '../components/ui/DataTable'
import { api } from '../lib/api'

const TYPE_ICONS: Record<string, React.ElementType> = {
  EMAIL: Mail,
  CALL: Phone,
  MEETING: Video,
  NOTE: FileText,
  LINKEDIN: Linkedin,
}

const TYPE_LABELS: Record<string, string> = {
  EMAIL: 'Email',
  CALL: 'Llamada',
  MEETING: 'Reunión',
  LINKEDIN: 'LinkedIn',
  NOTE: 'Nota',
}

export function ActivitiesView() {
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/activities').then(d => {
      if (d) setActivities(Array.isArray(d) ? d : d.data ?? [])
      setLoading(false)
    })
  }, [])

  const columns: Column<any>[] = [
    {
      label: 'Actividad', key: 'type',
      render: (val, row) => {
        const Icon = TYPE_ICONS[val] ?? MessageSquare
        return (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-surface-container rounded-lg shrink-0">
              <Icon size={16} className="text-on-surface-variant" />
            </div>
            <div>
              <div className="text-sm font-bold text-on-surface">{TYPE_LABELS[val] ?? val}</div>
              <div className="text-[10px] text-on-surface-variant">{row.outcome ?? row.notes ?? '—'}</div>
            </div>
          </div>
        )
      },
    },
    {
      label: 'Empresa', key: 'prospectName',
      render: (val, row) => (
        <span className="text-sm">{val ?? row.prospect?.name ?? row.deal?.prospect?.name ?? '—'}</span>
      ),
    },
    {
      label: 'Fecha', key: 'doneAt',
      render: val => (
        <span className="text-sm text-on-surface-variant">
          {val ? new Date(val).toLocaleDateString('es-CO') : '—'}
        </span>
      ),
    },
    {
      label: 'Estado', key: 'doneAt',
      render: val => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
          val
            ? 'bg-green-50 text-green-700 border-green-100'
            : 'bg-orange-50 text-orange-700 border-orange-100'
        }`}>
          {val ? 'Completado' : 'Pendiente'}
        </span>
      ),
    },
    {
      label: 'Responsable', key: 'createdByName',
      render: (val, row) => <span className="text-sm">{val ?? row.createdBy?.name ?? '—'}</span>,
    },
  ]

  return (
    <DataTable
      title="Gestión de Actividades"
      subtitle="Gestiona el directorio activo de actividades."
      data={activities}
      columns={columns}
      loading={loading}
    />
  )
}
