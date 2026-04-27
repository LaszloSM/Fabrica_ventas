import React, { useEffect, useState } from 'react'
import { DataTable, Column } from '../components/ui/DataTable'
import { api } from '../lib/api'

export function ContactsView() {
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/contacts').then(d => {
      if (d) setContacts(Array.isArray(d) ? d : d.data ?? [])
      setLoading(false)
    })
  }, [])

  const columns: Column<any>[] = [
    {
      label: 'Nombre', key: 'name',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-primary-container/10 flex items-center justify-center font-bold text-xs text-brand-primary-container shrink-0">
            {(val ?? '?')[0].toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-bold text-on-surface">{val}</div>
            <div className="text-[10px] text-on-surface-variant">{row.email ?? '—'}</div>
          </div>
        </div>
      ),
    },
    { label: 'Rol', key: 'role', render: val => <span className="text-sm">{val ?? '—'}</span> },
    {
      label: 'Empresa', key: 'prospectName',
      render: (val, row) => <span className="text-sm">{val ?? row.prospect?.name ?? '—'}</span>,
    },
    { label: 'Teléfono', key: 'phone', render: val => <span className="text-sm">{val ?? '—'}</span> },
    {
      label: 'Principal', key: 'isPrimary',
      render: val => val
        ? <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100 text-[10px] font-bold">Principal</span>
        : null,
    },
  ]

  return (
    <DataTable
      title="Directorio de Contactos"
      subtitle="Gestiona el directorio activo de contactos."
      data={contacts}
      columns={columns}
      loading={loading}
    />
  )
}
