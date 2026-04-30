import React from 'react'
import {
  LayoutDashboard, Kanban, Handshake, Building2, Users,
  CalendarDays, Target, LineChart, Settings, Plus, HelpCircle, LogOut
} from 'lucide-react'
import { ViewType } from '../../App'
import { useAuth } from '../../context/AuthContext'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pipeline', label: 'Pipeline', icon: Kanban },
  { id: 'opportunities', label: 'Oportunidades', icon: Handshake },
  { id: 'accounts', label: 'Cuentas', icon: Building2 },
  { id: 'contacts', label: 'Contactos', icon: Users },
  { id: 'activities', label: 'Actividades', icon: CalendarDays },
  { id: 'goals', label: 'Metas', icon: Target },
  { id: 'reports', label: 'Reportes', icon: LineChart },
  { id: 'settings', label: 'Configuración', icon: Settings },
] as const

interface Props {
  currentView: ViewType
  onViewChange: (v: ViewType) => void
  onNewOpportunity: () => void
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ currentView, onViewChange, onNewOpportunity, isOpen, onClose }: Props) {
  const { logout } = useAuth()
  const active = currentView === 'opportunity-detail' ? 'opportunities' : currentView

  return (
    <aside className={`w-[240px] h-screen border-r border-outline-variant bg-white flex flex-col fixed left-0 top-0 z-50 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
      <div className="p-6 border-b border-outline-variant/50">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded bg-brand-primary-container text-white flex items-center justify-center font-bold font-display cursor-pointer"
            onClick={() => onViewChange('dashboard')}
          >
            C
          </div>
          <div>
            <h1
              className="text-xl font-extrabold tracking-tight text-brand-primary-container leading-none cursor-pointer"
              onClick={() => onViewChange('dashboard')}
            >
              CoimpactoB
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mt-1 opacity-70">Impact CRM</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <button
          onClick={onNewOpportunity}
          className="w-full bg-brand-primary-container text-white rounded-lg py-2.5 px-4 flex items-center justify-center gap-2 font-semibold hover:bg-brand-primary transition-all shadow-sm active:scale-95"
        >
          <Plus size={18} />
          <span>Nueva Oportunidad</span>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id as ViewType)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all active:scale-[0.98] ${
              active === item.id
                ? 'bg-blue-50 text-brand-primary-container border-l-[3px] border-brand-primary-container font-bold'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-brand-primary-container'
            }`}
          >
            <item.icon size={20} />
            <span className="font-display text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-outline-variant space-y-1">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-all text-sm">
          <HelpCircle size={18} />
          <span>Ayuda</span>
        </button>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-all text-sm"
        >
          <LogOut size={18} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  )
}
