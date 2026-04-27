import React, { useEffect, useState } from 'react'
import { User, Briefcase, ShieldCheck, Bell, Cpu, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

type Tab = 'profile' | 'business-units' | 'users' | 'notifications' | 'integrations'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Perfil y Cuenta', icon: User },
  { id: 'business-units', label: 'Unidades de Negocio', icon: Briefcase },
  { id: 'users', label: 'Usuarios y Roles', icon: ShieldCheck },
  { id: 'notifications', label: 'Notificaciones', icon: Bell },
  { id: 'integrations', label: 'Integraciones', icon: Cpu },
]

function ProfileTab() {
  const { user } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [saved, setSaved] = useState(false)

  const save = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <div className="flex items-center gap-6 mb-8">
        <div className="w-24 h-24 rounded-full bg-brand-primary-container/10 border-2 border-brand-primary-container flex items-center justify-center text-3xl font-bold text-brand-primary-container">
          {(user?.name ?? 'U')[0].toUpperCase()}
        </div>
        <div>
          <h3 className="text-xl font-bold">{user?.name}</h3>
          <p className="text-sm text-on-surface-variant">{user?.email}</p>
          <span className="inline-block mt-2 px-2 py-1 bg-surface-container rounded-md text-[10px] font-bold uppercase text-on-surface-variant">
            {user?.role}
          </span>
        </div>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Nombre Completo</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="bg-surface border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Email</label>
            <input
              type="text"
              value={user?.email ?? ''}
              readOnly
              className="bg-surface-container border border-outline-variant rounded-xl p-3 text-sm text-on-surface-variant"
            />
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <button
            onClick={save}
            className="bg-brand-primary-container text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-brand-primary-container/20"
          >
            {saved ? '¡Guardado!' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

function UsersTab() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/users').then(d => {
      if (d) setUsers(Array.isArray(d) ? d : d.data ?? [])
      setLoading(false)
    })
  }, [])

  const ROLE_COLORS: Record<string, string> = {
    ADMIN: 'bg-blue-50 text-blue-700 border-blue-100',
    SALES: 'bg-green-50 text-green-700 border-green-100',
    VIEWER: 'bg-surface-container text-on-surface-variant border-outline-variant',
  }

  return (
    <div>
      <h4 className="font-bold text-lg mb-4">Usuarios del Sistema</h4>
      {loading ? (
        <p className="text-sm text-on-surface-variant">Cargando usuarios...</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-on-surface-variant">No hay usuarios registrados.</p>
      ) : (
        <div className="divide-y divide-outline-variant">
          {users.map(u => (
            <div key={u.id} className="py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-primary-container/10 flex items-center justify-center font-bold text-sm text-brand-primary-container">
                  {(u.name ?? '?')[0].toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-bold text-on-surface">{u.name}</div>
                  <div className="text-xs text-on-surface-variant">{u.email}</div>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${ROLE_COLORS[u.role] ?? ROLE_COLORS.VIEWER}`}>
                {u.role}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const BUSINESS_UNITS = [
  'CredImpacto Grupos', 'CredImpacto Créditos', 'CredImpacto Fondo Rotatorio',
  'CredImpacto Proveedores', 'Academia Curso', 'Consultoría Proyecto',
  'Fundación Convenio', 'Fundación Convocatoria', 'Fundación Fundraising', 'Fundación Experiencia',
]

export function SettingsView() {
  const [tab, setTab] = useState<Tab>('profile')

  const tabContent: Record<Tab, React.ReactNode> = {
    profile: <ProfileTab />,
    'business-units': (
      <div>
        <h4 className="font-bold text-lg mb-4">Unidades de Negocio</h4>
        <div className="space-y-3">
          {BUSINESS_UNITS.map(unit => (
            <div key={unit} className="flex items-center justify-between p-4 bg-surface-container-low/50 rounded-xl border border-outline-variant">
              <span className="text-sm font-bold">{unit}</span>
              <span className="text-xs text-on-surface-variant px-2 py-0.5 bg-surface-container rounded-full">Activo</span>
            </div>
          ))}
        </div>
      </div>
    ),
    users: <UsersTab />,
    notifications: (
      <div>
        <h4 className="font-bold text-lg mb-4">Notificaciones</h4>
        <p className="text-sm text-on-surface-variant">Configuración de notificaciones próximamente.</p>
      </div>
    ),
    integrations: (
      <div>
        <h4 className="font-bold text-lg mb-4">Integraciones</h4>
        <p className="text-sm text-on-surface-variant">Google Sheets y otras integraciones próximamente.</p>
      </div>
    ),
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h2 className="text-3xl font-bold text-on-surface">Configuración</h2>
        <p className="text-on-surface-variant mt-1">Personaliza tu entorno de CoimpactoB.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-2">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                tab === t.id
                  ? 'bg-blue-50 border-blue-200 text-brand-primary-container font-bold'
                  : 'bg-white border-outline-variant hover:bg-surface-container'
              }`}
            >
              <div className="flex items-center gap-3">
                <t.icon size={20} />
                <span className="text-sm">{t.label}</span>
              </div>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>

        <div className="md:col-span-2 glass-card p-8">
          {tabContent[tab]}
        </div>
      </div>
    </div>
  )
}
