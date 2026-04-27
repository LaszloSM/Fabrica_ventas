import React, { useEffect, useState } from 'react'
import { DataTable, Column } from '../components/ui/DataTable'
import { api } from '../lib/api'

const STAGE_LABELS: Record<string, string> = {
  PROSPECTO_IDENTIFICADO: 'Prospecto',
  SENAL_DETECTADA: 'Señal',
  PRIMER_CONTACTO: 'Primer Contacto',
  EN_SECUENCIA: 'En Secuencia',
  REUNION_AGENDADA: 'Reunión Agendada',
  PROPUESTA_ENVIADA: 'Propuesta',
  NEGOCIACION: 'Negociación',
  GANADO: 'Ganado',
  PERDIDO: 'Perdido',
}

const STAGE_COLORS: Record<string, string> = {
  GANADO: 'bg-green-50 text-green-700 border-green-100',
  PERDIDO: 'bg-red-50 text-red-700 border-red-100',
  NEGOCIACION: 'bg-orange-50 text-orange-700 border-orange-100',
}

interface Props {
  onDealClick: (id: string) => void
  onNewDeal: () => void
}

export function OpportunitiesView({ onDealClick, onNewDeal }: Props) {
  const [deals, setDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/deals').then(d => {
      if (d) setDeals(Array.isArray(d) ? d : d.data ?? [])
      setLoading(false)
    })
  }, [])

  const columns: Column<any>[] = [
    {
      label: 'Cuenta / Tipo', key: 'prospectName',
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-brand-primary-container">
            {val ?? row.prospect?.name ?? '—'}
          </span>
          <span className="text-[10px] text-on-surface-variant mt-0.5">
            {(row.serviceType ?? '').replace(/_/g, ' ')}
          </span>
        </div>
      ),
    },
    {
      label: 'Etapa', key: 'stage',
      render: val => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${STAGE_COLORS[val] ?? 'bg-blue-50 text-blue-700 border-blue-100'}`}>
          {STAGE_LABELS[val] ?? val}
        </span>
      ),
    },
    {
      label: 'Valor', key: 'value',
      render: val => <span className="text-sm font-bold">${(val ?? 0).toLocaleString('es-CO')} USD</span>,
    },
    {
      label: 'Responsable', key: 'assignedToName',
      render: (val, row) => <span className="text-sm">{val ?? row.assignedUser?.name ?? '—'}</span>,
    },
    {
      label: 'Trimestre', key: 'quarter',
      render: val => <span className="text-sm text-on-surface-variant">{val ?? '—'}</span>,
    },
  ]

  return (
    <DataTable
      title="Oportunidades Activas"
      subtitle="Gestiona el directorio activo de oportunidades."
      data={deals}
      columns={columns}
      onRowClick={row => onDealClick(row.id)}
      onAdd={onNewDeal}
      addLabel="Nueva Oportunidad"
      loading={loading}
    />
  )
}
