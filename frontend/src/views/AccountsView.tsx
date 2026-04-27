import React, { useEffect, useState } from 'react'
import { DataTable, Column } from '../components/ui/DataTable'
import { api } from '../lib/api'

export function AccountsView() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/prospects').then(d => {
      if (d) setAccounts(Array.isArray(d) ? d : d.prospects ?? [])
      setLoading(false)
    })
  }, [])

  const columns: Column<any>[] = [
    {
      label: 'Cuenta', key: 'name',
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-brand-primary-container">{val}</span>
          {row.website && <span className="text-[10px] text-on-surface-variant">{row.website}</span>}
        </div>
      ),
    },
    { label: 'Industria', key: 'industry', render: val => <span className="text-sm">{val ?? '—'}</span> },
    { label: 'Tamaño', key: 'size', render: val => <span className="text-sm">{val ?? '—'}</span> },
    { label: 'Región', key: 'region', render: val => <span className="text-sm">{val ?? '—'}</span> },
    { label: 'Segmento', key: 'segment', render: val => <span className="text-sm">{val ?? '—'}</span> },
  ]

  return (
    <DataTable
      title="Directorio de Cuentas"
      subtitle="Gestiona el directorio activo de cuentas."
      data={accounts}
      columns={columns}
      loading={loading}
    />
  )
}
