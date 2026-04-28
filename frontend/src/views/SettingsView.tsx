import React, { useEffect, useState } from 'react'
import { User, Briefcase, ShieldCheck, Bell, Cpu, ChevronRight, RefreshCw, Crown, Target, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

type Tab = 'profile' | 'business-units' | 'users' | 'goals' | 'notifications' | 'integrations'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Perfil y Cuenta', icon: User },
  { id: 'business-units', label: 'Unidades de Negocio', icon: Briefcase },
  { id: 'users', label: 'Usuarios y Roles', icon: ShieldCheck },
  { id: 'goals', label: 'Metas', icon: Target },
  { id: 'notifications', label: 'Notificaciones', icon: Bell },
  { id: 'integrations', label: 'Integraciones', icon: Cpu },
]

const ROLE_META: Record<string, { label: string; color: string; desc: string }> = {
  SUPERADMIN: { label: 'SuperAdmin', color: 'bg-purple-50 text-purple-700 border-purple-300', desc: 'Creador del sistema. Control total, no puede ser degradado.' },
  ADMIN:  { label: 'Admin',   color: 'bg-blue-50 text-blue-700 border-blue-200',   desc: 'Gestiona usuarios, metas y configuracion.' },
  SALES:  { label: 'Ventas',  color: 'bg-green-50 text-green-700 border-green-200', desc: 'Gestiona oportunidades y actividades propias.' },
  VIEWER: { label: 'Viewer',  color: 'bg-slate-50 text-slate-600 border-slate-200', desc: 'Solo lectura de todo el sistema.' },
}

function ProfileTab() {
  const { user, setUser } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [saved, setSaved] = useState(false)
  const [promoting, setPromoting] = useState(false)
  const [promoteMsg, setPromoteMsg] = useState('')

  const save = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const ensureAdmin = async () => {
    setPromoting(true)
    const res = await api.post('/users/ensure-admin', {})
    if (res?.data?.action === 'promoted') {
      // Refresh session to get updated role immediately — no logout needed
      try {
        const sessionRes = await fetch('/auth/session', { credentials: 'include' })
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json()
          if (sessionData.user) setUser(sessionData.user)
        }
      } catch { /* ignore */ }
      setPromoteMsg('✅ Rol SuperAdmin activado correctamente.')
    } else {
      setPromoteMsg(res?.data?.message ?? 'Sin cambios necesarios.')
    }
    setPromoting(false)
  }

  return (
    <div>
      <div className="flex items-center gap-6 mb-8">
        {user?.image ? (
          <img src={user.image} className="w-24 h-24 rounded-full object-cover border-2 border-brand-primary-container" />
        ) : (
          <div className="w-24 h-24 rounded-full bg-brand-primary-container/10 border-2 border-brand-primary-container flex items-center justify-center text-3xl font-bold text-brand-primary-container">
            {(user?.name ?? 'U')[0].toUpperCase()}
          </div>
        )}
        <div>
          <h3 className="text-xl font-bold">{user?.name}</h3>
          <p className="text-sm text-on-surface-variant">{user?.email}</p>
          <span className={`inline-block mt-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${ROLE_META[user?.role ?? 'SALES']?.color}`}>
            {ROLE_META[user?.role ?? 'SALES']?.label}
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
        <div className="flex justify-end pt-2">
          <button
            onClick={save}
            className="bg-brand-primary-container text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-brand-primary-container/20"
          >
            {saved ? '¡Guardado!' : 'Guardar Cambios'}
          </button>
        </div>

        {/* Admin / SuperAdmin promotion */}
        {user?.role !== 'SUPERADMIN' && (
          <div className="mt-6 p-4 rounded-xl border border-amber-200 bg-amber-50">
            <div className="flex items-start gap-3">
              <Crown size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-800">Eres el creador del sistema?</p>
                <p className="text-xs text-amber-700 mt-1">
                  {user?.role === 'ADMIN'
                    ? 'Ya eres Admin. Puedes activar SuperAdmin para tener control total.'
                    : 'Si eres el primer usuario, reclama el rol de SuperAdmin.'}
                </p>
                {promoteMsg && (
                  <p className="text-xs text-amber-900 font-bold mt-2">{promoteMsg}</p>
                )}
              </div>
              <button
                onClick={ensureAdmin}
                disabled={promoting}
                className="shrink-0 px-4 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 disabled:opacity-50 transition-colors"
              >
                {promoting ? 'Verificando...' : 'Activar SuperAdmin'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function UsersTab() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [changingRole, setChangingRole] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const loadUsers = () => {
    setLoading(true)
    api.get('/users').then(d => {
      if (d) {
        const list = Array.isArray(d) ? d : d.data ?? []
        setUsers(list)
      } else {
        console.warn('[UsersTab] API devolvio null/error')
        setMsg('Error al cargar usuarios. Verifica que el backend este corriendo.')
        setTimeout(() => setMsg(''), 5000)
      }
      setLoading(false)
    }).catch(err => {
      console.error('[UsersTab] Error:', err)
      setMsg('Error de conexion al cargar usuarios.')
      setTimeout(() => setMsg(''), 5000)
      setLoading(false)
    })
  }

  useEffect(() => { loadUsers() }, [])

  const changeRole = async (userId: string, newRole: string) => {
    const requesterRole = currentUser?.role
    if (!requesterRole || !['SUPERADMIN', 'ADMIN'].includes(requesterRole)) {
      setMsg('Solo un administrador puede cambiar roles.')
      return
    }
    setChangingRole(userId)
    const res = await api.patch(`/users/${userId}/role`, { role: newRole })
    if (res?.data) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
      setMsg('Rol actualizado correctamente.')
      setTimeout(() => setMsg(''), 3000)
    } else {
      setMsg('Error al cambiar el rol. Verifica permisos.')
      setTimeout(() => setMsg(''), 3000)
    }
    setChangingRole(null)
  }

  const canManage = currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'ADMIN'
  const isSuperAdmin = currentUser?.role === 'SUPERADMIN'

  const getAvailableRoles = (targetRole: string): string[] => {
    if (isSuperAdmin) return ['SUPERADMIN', 'ADMIN', 'SALES', 'VIEWER']
    if (currentUser?.role === 'ADMIN') {
      if (targetRole === 'SUPERADMIN') return ['SUPERADMIN']
      return ['SALES', 'VIEWER']
    }
    return []
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-bold text-lg">Usuarios del Sistema</h4>
        <button onClick={loadUsers} className="p-2 hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant" title="Recargar">
          <RefreshCw size={16} />
        </button>
      </div>

      {msg && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 font-bold">{msg}</div>
      )}

      {!canManage && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          Solo los administradores (SuperAdmin o Admin) pueden cambiar roles de usuarios.
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-on-surface-variant">Cargando usuarios...</div>
      ) : users.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-on-surface-variant">No hay usuarios registrados aún.</p>
          <p className="text-xs text-on-surface-variant mt-2">Los usuarios aparecen aquí cuando inician sesión por primera vez con Google.</p>
        </div>
      ) : (
        <div className="divide-y divide-outline-variant">
          {users.map(u => {
            const meta = ROLE_META[u.role] ?? ROLE_META.VIEWER
            const isMe = u.email === currentUser?.email
            return (
              <div key={u.id ?? u.email} className="py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-brand-primary-container/10 flex items-center justify-center font-bold text-sm text-brand-primary-container shrink-0">
                    {(u.name ?? u.email ?? '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-on-surface truncate">
                      {u.name ?? u.email}
                      {isMe && <span className="ml-2 text-[10px] text-on-surface-variant font-normal">(tú)</span>}
                    </div>
                    <div className="text-xs text-on-surface-variant truncate">{u.email}</div>
                  </div>
                </div>

                <div className="shrink-0">
                  {canManage && !isMe ? (
                    <select
                      value={u.role ?? 'SALES'}
                      disabled={changingRole === u.id}
                      onChange={e => changeRole(u.id, e.target.value)}
                      className="text-xs border border-outline-variant rounded-lg px-2 py-1.5 bg-surface focus:outline-none focus:border-brand-primary-container disabled:opacity-50"
                    >
                      {getAvailableRoles(u.role ?? 'SALES').map(r => (
                        <option key={r} value={r}>{ROLE_META[r]?.label ?? r}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${meta.color}`}>
                      {meta.label}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-6 p-4 rounded-xl bg-surface-container-low border border-outline-variant">
        <p className="text-xs font-bold text-on-surface-variant uppercase mb-2">Jerarquia de Roles</p>
        <div className="space-y-2">
          {Object.entries(ROLE_META).map(([key, m]) => (
            <div key={key} className="flex items-center gap-3">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${m.color}`}>{m.label}</span>
              <span className="text-xs text-on-surface-variant">{m.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const SERVICE_LABELS: Record<string, string> = {
  CREDIMPACTO_GRUPOS: 'CredImpacto Grupos',
  CREDIMPACTO_CREDITOS: 'CredImpacto Creditos',
  ACADEMIA_CURSO: 'Academia Curso',
  CONSULTORIA_PROYECTO: 'Consultoria Proyecto',
  FUNDACION_CONVENIO: 'Fundacion Convenio',
}

const SERVICE_TYPES = [
  { code: 'CREDIMPACTO_GRUPOS', label: 'CredImpacto Grupos' },
  { code: 'CREDIMPACTO_CREDITOS', label: 'CredImpacto Creditos' },
  { code: 'ACADEMIA_CURSO', label: 'Academia Curso' },
  { code: 'CONSULTORIA_PROYECTO', label: 'Consultoria Proyecto' },
  { code: 'FUNDACION_CONVENIO', label: 'Fundacion Convenio' },
]

function GoalsTab() {
  const { user: currentUser } = useAuth()
  const [goals, setGoals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any>(null)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const isAdmin = currentUser?.role === 'ADMIN'

  const loadGoals = () => {
    setLoading(true)
    api.get('/goals').then(d => {
      if (d) setGoals(d.data ?? [])
      setLoading(false)
    })
  }

  useEffect(() => { loadGoals() }, [])

  const submitGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg('')
    setError('')
    const payload = {
      serviceType: editing.serviceType,
      quarter: parseInt(editing.quarter),
      year: parseInt(editing.year),
      targetValue: parseFloat(editing.targetValue) || 0,
      targetUnits: parseInt(editing.targetUnits) || 0,
      currentValue: 0,
      currentUnits: 0,
    }
    try {
      if (editing.id) {
        await api.put(`/goals/${editing.id}`, payload)
        setMsg('Meta actualizada.')
      } else {
        await api.post('/goals', payload)
        setMsg('Meta creada.')
      }
      setEditing(null)
      loadGoals()
      setTimeout(() => setMsg(''), 3000)
    } catch {
      setError('Error al guardar la meta.')
    }
  }

  const deleteGoal = async (id: string) => {
    if (!confirm('Eliminar esta meta?')) return
    await api.delete(`/goals/${id}`)
    loadGoals()
  }

  const newGoal = () => {
    setEditing({
      id: null,
      serviceType: 'CONSULTORIA_PROYECTO',
      quarter: 1,
      year: 2026,
      targetValue: 0,
      targetUnits: 0,
    })
  }

  if (!isAdmin) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
        Solo los administradores pueden gestionar las metas.
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-bold text-lg">Metas de Ventas</h4>
          <p className="text-sm text-on-surface-variant mt-1">Configura las metas por unidad de negocio y trimestre.</p>
        </div>
        <button
          onClick={loadGoals}
          className="p-2 hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant"
          title="Recargar"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {msg && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 font-bold">{msg}</div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-bold">{error}</div>
      )}

      {editing ? (
        <form onSubmit={submitGoal} className="p-6 rounded-xl border border-brand-primary-container bg-blue-50/30 mb-6 space-y-4">
          <h5 className="font-bold text-sm">{editing.id ? 'Editar Meta' : 'Nueva Meta'}</h5>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Unidad de Negocio</label>
              <select
                value={editing.serviceType}
                onChange={e => setEditing({ ...editing, serviceType: e.target.value })}
                className="bg-surface border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container"
              >
                {SERVICE_TYPES.map(s => (
                  <option key={s.code} value={s.code}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Trimestre</label>
              <select
                value={editing.quarter}
                onChange={e => setEditing({ ...editing, quarter: parseInt(e.target.value) })}
                className="bg-surface border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container"
              >
                {[1, 2, 3, 4].map(q => (
                  <option key={q} value={q}>Q{q}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Ano</label>
              <input
                type="number"
                value={editing.year}
                onChange={e => setEditing({ ...editing, year: e.target.value })}
                className="bg-surface border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Meta (COP)</label>
              <input
                type="number"
                value={editing.targetValue}
                onChange={e => setEditing({ ...editing, targetValue: e.target.value })}
                placeholder="0"
                min="0"
                className="bg-surface border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-4 py-2 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-brand-primary-container text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-brand-primary-container/20"
            >
              {editing.id ? 'Guardar Cambios' : 'Crear Meta'}
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={newGoal}
          className="mb-6 flex items-center gap-2 px-4 py-2.5 bg-brand-primary-container text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-primary-container/20 hover:opacity-90 transition-opacity"
        >
          <Plus size={16} />
          Nueva Meta
        </button>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-on-surface-variant">Cargando metas...</div>
      ) : goals.length === 0 ? (
        <div className="py-8 text-center">
          <Target size={40} className="mx-auto text-outline mb-3" />
          <p className="text-sm text-on-surface-variant">No hay metas configuradas.</p>
          <p className="text-xs text-on-surface-variant mt-1">Crea la primera meta haciendo clic en Nueva Meta.</p>
        </div>
      ) : (
        <div className="divide-y divide-outline-variant">
          {goals.map((goal: any) => (
            <div key={goal.id} className="py-4 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-on-surface">
                  {SERVICE_LABELS[goal.serviceType] ?? goal.serviceType}
                </div>
                <div className="text-xs text-on-surface-variant mt-0.5">
                  Q{goal.quarter} {goal.year}
                  {goal.region ? ` - ${goal.region}` : ''}
                </div>
                <div className="text-xs text-on-surface-variant mt-0.5">
                  Meta: ${(goal.targetValue ?? 0).toLocaleString('es-CO')} COP
                  {goal.targetUnits ? ` - ${goal.targetUnits} unidades` : ''}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-green-600">
                  {goal.currentValue > 0 ? `Ganado: $${(goal.currentValue ?? 0).toLocaleString('es-CO')}` : ''}
                </span>
                <button
                  onClick={() => setEditing({
                    id: goal.id,
                    serviceType: goal.serviceType,
                    quarter: goal.quarter,
                    year: goal.year,
                    targetValue: goal.targetValue ?? 0,
                    targetUnits: goal.targetUnits ?? 0,
                  })}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-outline-variant hover:bg-surface-container transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => deleteGoal(goal.id)}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const BUSINESS_UNITS = [
  { name: 'CredImpacto Grupos',      code: 'CREDIMPACTO_GRUPOS',        color: 'bg-blue-50 text-blue-700' },
  { name: 'CredImpacto Créditos',    code: 'CREDIMPACTO_CREDITOS',       color: 'bg-indigo-50 text-indigo-700' },
  { name: 'Fondo Rotatorio',         code: 'CREDIMPACTO_FONDO_ROTATORIO',color: 'bg-violet-50 text-violet-700' },
  { name: 'CredImpacto Proveedores', code: 'CREDIMPACTO_PROVEEDORES',    color: 'bg-purple-50 text-purple-700' },
  { name: 'Academia Curso',          code: 'ACADEMIA_CURSO',             color: 'bg-amber-50 text-amber-700' },
  { name: 'Consultoría Proyecto',    code: 'CONSULTORIA_PROYECTO',       color: 'bg-orange-50 text-orange-700' },
  { name: 'Fundación Convenio',      code: 'FUNDACION_CONVENIO',         color: 'bg-green-50 text-green-700' },
  { name: 'Fundación Convocatoria',  code: 'FUNDACION_CONVOCATORIA',     color: 'bg-teal-50 text-teal-700' },
  { name: 'Fundraising',             code: 'FUNDACION_FUNDRAISING',      color: 'bg-cyan-50 text-cyan-700' },
  { name: 'Fundación Experiencia',   code: 'FUNDACION_EXPERIENCIA',      color: 'bg-sky-50 text-sky-700' },
]

export function SettingsView() {
  const [tab, setTab] = useState<Tab>('profile')

  const tabContent: Record<Tab, React.ReactNode> = {
    profile: <ProfileTab />,
    'business-units': (
      <div>
        <h4 className="font-bold text-lg mb-4">Unidades de Negocio</h4>
        <p className="text-sm text-on-surface-variant mb-6">
          Líneas de servicio activas de CoimpactoB. Cada oportunidad se asocia a una de estas unidades para el seguimiento de metas.
        </p>
        <div className="space-y-2">
          {BUSINESS_UNITS.map(unit => (
            <div key={unit.code} className="flex items-center justify-between p-4 bg-surface-container-low/50 rounded-xl border border-outline-variant">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${unit.color.split(' ')[0].replace('bg-', 'bg-')}`} />
                <span className="text-sm font-bold">{unit.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-on-surface-variant font-mono">{unit.code}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${unit.color}`}>Activo</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    users: <UsersTab />,
    goals: <GoalsTab />,
    notifications: (
      <div>
        <h4 className="font-bold text-lg mb-2">Notificaciones</h4>
        <p className="text-sm text-on-surface-variant">Configuración de alertas y notificaciones — próximamente.</p>
      </div>
    ),
    integrations: (
      <div>
        <h4 className="font-bold text-lg mb-2">Integraciones</h4>
        <p className="text-sm text-on-surface-variant mb-6">Conecta CoimpactoB con herramientas externas.</p>
        <div className="space-y-3">
          {[
            { name: 'Google Sheets', desc: 'Exporta datos automáticamente a hojas de cálculo', status: 'Próximamente' },
            { name: 'SendGrid', desc: 'Envío de correos de seguimiento automático', status: 'Próximamente' },
            { name: 'Slack', desc: 'Alertas de deals y actividades en tiempo real', status: 'Próximamente' },
          ].map(i => (
            <div key={i.name} className="p-4 rounded-xl border border-outline-variant flex items-center justify-between">
              <div>
                <div className="font-bold text-sm">{i.name}</div>
                <div className="text-xs text-on-surface-variant mt-0.5">{i.desc}</div>
              </div>
              <span className="text-[10px] px-2 py-1 bg-surface-container rounded-full text-on-surface-variant font-bold">{i.status}</span>
            </div>
          ))}
        </div>
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
                  : 'bg-white border-outline-variant hover:bg-surface-container text-on-surface'
              }`}
            >
              <div className="flex items-center gap-3">
                <t.icon size={18} />
                <span className="text-sm">{t.label}</span>
              </div>
              <ChevronRight size={14} />
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
