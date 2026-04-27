/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as Icons from 'lucide-react';
import { 
  ViewType, 
  NAVIGATION_ITEMS, 
  MOCK_OPPORTUNITIES, 
  MOCK_ACTIVITIES,
  MOCK_ACCOUNTS,
  MOCK_USERS,
  Opportunity
} from './constants';
import { OpportunityDetail } from './components/OpportunityDetail';
import { Modal, NewOpportunityForm } from './components/Modals';

// --- Shared Components ---

const Sidebar = ({ 
  currentView, 
  onViewChange, 
  onNewOpportunity 
}: { 
  currentView: ViewType, 
  onViewChange: (v: ViewType) => void,
  onNewOpportunity: () => void
}) => {
  return (
    <aside className="w-[240px] h-screen border-r border-outline-variant bg-white flex flex-col fixed left-0 top-0 z-50">
      <div className="p-6 border-b border-transparent">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-brand-primary-container text-white flex items-center justify-center font-bold font-display cursor-pointer" onClick={() => onViewChange('dashboard')}>C</div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-brand-primary-container leading-none cursor-pointer" onClick={() => onViewChange('dashboard')}>CoimpactoB</h1>
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mt-1 opacity-70">Impact CRM</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <button 
          onClick={onNewOpportunity}
          className="w-full bg-brand-primary-container text-white rounded-lg py-2.5 px-4 flex items-center justify-center gap-2 font-semibold hover:bg-brand-primary transition-all shadow-sm active:scale-95"
        >
          <Icons.Plus size={18} />
          <span>Nueva Oportunidad</span>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
        {NAVIGATION_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id as ViewType)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all active:scale-[0.98] ${
              currentView === item.id 
                ? 'bg-blue-50 text-brand-primary-container border-l-[3px] border-brand-primary-container font-bold' 
                : 'text-on-surface-variant hover:bg-surface-container hover:text-brand-primary'
            }`}
          >
            <item.icon size={20} className={currentView === item.id ? 'fill-blue-100' : ''} />
            <span className="font-display text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-outline-variant space-y-1">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-all">
          <Icons.HelpCircle size={18} />
          <span className="text-sm font-medium">Ayuda</span>
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-all">
          <Icons.LogOut size={18} />
          <span className="text-sm font-medium">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};

const TopNav = () => {
  const [searchQuery, setSearchQuery] = useState('');
  
  return (
    <header className="h-16 border-b border-outline-variant bg-white/80 backdrop-blur-md sticky top-0 z-40 flex justify-between items-center px-8">
      <div className="flex-1 max-w-md relative group">
        <Icons.Search className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${searchQuery ? 'text-brand-primary' : 'text-outline'}`} size={18} />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar registros, actividades..." 
          className="w-full bg-surface border border-outline-variant rounded-full py-1.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
        />
      </div>

      <div className="flex items-center gap-4">
        <button className="px-4 py-1.5 border border-brand-primary text-brand-primary rounded-lg font-bold text-sm hover:bg-blue-50 transition-colors">
          Acción Rápida
        </button>
        <div className="h-6 w-px bg-outline-variant mx-2" />
        <div className="flex items-center gap-2">
          <button className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full relative">
            <Icons.Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-crm-error rounded-full border-2 border-white" />
          </button>
          <button className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full">
            <Icons.Settings size={20} />
          </button>
          <button className="ml-2 w-8 h-8 rounded-full border border-outline-variant overflow-hidden hover:ring-2 hover:ring-brand-primary-container transition-all">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Profile" className="w-full h-full object-cover" />
          </button>
        </div>
      </div>
    </header>
  );
};

// --- View Components ---

const DashboardView = ({ onOpportunityClick }: { onOpportunityClick: (opp: Opportunity) => void }) => {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h2 className="text-3xl font-bold text-on-surface">Dashboard Operativo</h2>
        <p className="text-on-surface-variant mt-1">Monitorea el pulso de impacto de tu organización.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Pipeline Total', value: '$2.45M', change: '+12%', icon: Icons.TrendingUp, color: 'text-blue-600' },
          { label: 'Ponderado', value: '$1.12M', change: '+5%', icon: Icons.Activity, color: 'text-brand-secondary' },
          { label: 'Metas Ganadas', value: '78%', change: '+3%', icon: Icons.Trophy, color: 'text-brand-tertiary' },
          { label: 'Alertas', value: '12', change: 'Críticas', icon: Icons.AlertTriangle, color: 'text-crm-error' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{stat.label}</span>
              <stat.icon className={stat.color} size={20} />
            </div>
            <div className="text-2xl font-bold text-on-surface">{stat.value}</div>
            <div className={`text-xs mt-2 font-bold ${stat.color}`}>{stat.change} <span className="text-on-surface-variant font-normal">vs mes anterior</span></div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-xl">Metas Trimestrales</h3>
            <button className="text-brand-primary-container text-sm font-bold hover:underline">Ver Reporte</button>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex justify-between text-sm font-bold">
              <span>Avance Global</span>
              <span className="text-brand-primary-container">65%</span>
            </div>
            <div className="w-full bg-surface-container h-4 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '65%' }}
                className="bg-brand-primary-container h-full rounded-full"
              />
            </div>
            <div className="grid grid-cols-3 gap-8 mt-8 pt-6 border-t border-outline-variant">
              <div>
                <div className="text-xs text-on-surface-variant uppercase font-bold mb-1">Cierre Real</div>
                <div className="text-xl font-bold">$975,000</div>
              </div>
              <div>
                <div className="text-xs text-on-surface-variant uppercase font-bold mb-1">Proyectado</div>
                <div className="text-xl font-bold">$1.35M</div>
              </div>
              <div>
                <div className="text-xs text-on-surface-variant uppercase font-bold mb-1">Brecha</div>
                <div className="text-xl font-bold text-crm-error">-$150,000</div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 flex flex-col">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Icons.AlertTriangle className="text-brand-secondary" size={20} />
            Alertas de Gestión
          </h3>
          <div className="space-y-4 flex-1">
            {[
              { title: '2 Oportunidades Vencidas', sub: 'Revisar status inmediatamente', type: 'error' },
              { title: '5 Sin Próxima Acción', sub: 'Opps estancadas > 14 días', type: 'warning' },
              { title: 'Actualización Requerida', sub: '3 contactos sin interacción', type: 'info' }
            ].map((alert, i) => (
              <div key={i} className={`p-4 rounded-lg border flex flex-col gap-1 ${
                alert.type === 'error' ? 'bg-red-50 border-red-200' : 
                alert.type === 'warning' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'
              }`}>
                <span className={`text-xs font-bold ${
                  alert.type === 'error' ? 'text-red-700' : 
                  alert.type === 'warning' ? 'text-orange-700' : 'text-blue-700'
                }`}>{alert.title}</span>
                <span className="text-xs text-on-surface-variant">{alert.sub}</span>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-2 border border-outline-variant rounded-lg text-sm font-bold text-on-surface-variant hover:bg-surface-container">
            Atender todas
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/30">
          <h3 className="font-bold text-lg">Tareas Prioritarias Hoy</h3>
          <button className="flex items-center gap-1 text-brand-primary-container text-sm font-bold">
            <Icons.Plus size={16} /> Añadir Tarea
          </button>
        </div>
        <div className="divide-y divide-outline-variant">
          {MOCK_OPPORTUNITIES.map((opp, i) => (
            <div 
              key={i} 
              onClick={() => onOpportunityClick(opp)}
              className="p-4 flex items-center justify-between hover:bg-surface-container-low/20 transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-5 h-5 border-2 border-outline-variant rounded flex items-center justify-center cursor-pointer hover:border-brand-primary-container">
                  <div className="w-2.5 h-2.5 bg-brand-primary-container rounded-sm opacity-0 group-hover:opacity-20 translate-y-2 group-hover:translate-y-0 transition-all" />
                </div>
                <div>
                  <div className="text-sm font-bold text-on-surface">{opp.nextAction}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Icons.Briefcase size={12} className="text-on-surface-variant" />
                    <span className="text-xs text-on-surface-variant">{opp.account}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                   opp.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-surface-container text-on-surface-variant'
                }`}>
                  {opp.priority === 'high' ? 'Alta Prioridad' : 'Media'}
                </span>
                <span className="text-xs text-on-surface-variant w-20 text-right">{opp.dueDate}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const PipelineView = ({ onOpportunityClick }: { onOpportunityClick: (opp: Opportunity) => void }) => {
  const stages = ['Prospecto Identificado', 'Contacto Inicial', 'Reunión Agendada', 'Diagnóstico', 'Propuesta Enviada', 'Negociación'];
  
  return (
    <div className="h-full flex flex-col gap-6 overflow-hidden">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-on-surface">Pipeline de Ventas</h2>
          <p className="text-on-surface-variant mt-1">Visualiza y gestiona las etapas de impacto.</p>
        </div>
        <div className="flex gap-2">
          <button className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container"><Icons.Filter size={18} /></button>
          <button className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container"><Icons.Download size={18} /></button>
        </div>
      </header>

      <div className="flex-1 overflow-x-auto flex gap-6 pb-6 custom-scrollbar">
        {stages.map((stage, i) => (
          <div key={stage} className="w-[300px] shrink-0 flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-outline' : i === 4 ? 'bg-brand-secondary' : 'bg-brand-primary-container'}`} />
                {stage}
              </h3>
              <span className="text-[10px] font-bold bg-surface-container py-0.5 px-2 rounded-full">
                {i % 2 === 0 ? 2 : 1}
              </span>
            </div>
            
            <div className="flex-1 bg-surface-container-low/30 rounded-xl border border-outline-variant border-dashed p-3 flex flex-col gap-3 min-h-[300px]">
              {MOCK_OPPORTUNITIES.filter(o => (i === 4 && o.stage === 'Propuesta') || (i === 5 && o.stage === 'Negociación') || (i < 4 && i === 0)).map((opp) => (
                <motion.div 
                  key={opp.id}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => onOpportunityClick(opp)}
                  className="bg-white p-4 rounded-xl border border-outline-variant shadow-sm cursor-pointer border-l-4 border-l-brand-primary-container"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-bold text-brand-primary-container">{opp.account}</h4>
                    <Icons.MoreVertical size={14} className="text-on-surface-variant" />
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">{opp.name}</p>
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-outline-variant/30">
                    <span className="text-sm font-bold">${opp.value.toLocaleString()} USD</span>
                    <div className="w-6 h-6 rounded-full bg-brand-tertiary-container flex items-center justify-center text-[10px] text-white font-bold">
                      {opp.owner.split(' ').map(n => n[0]).join('')}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const TableView = ({ 
  title, 
  data, 
  type, 
  columns, 
  onRowClick 
}: { 
  title: string, 
  data: any[], 
  type: string, 
  columns: { label: string, key: string, render?: (val: any, row: any) => React.ReactNode }[],
  onRowClick?: (row: any) => void
}) => {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-on-surface">{title}</h2>
          <p className="text-on-surface-variant mt-1">Gestiona el directorio activo de {type}.</p>
        </div>
        <button className="bg-brand-primary-container text-white py-2 px-6 rounded-lg font-bold flex items-center gap-2 shadow-sm">
          <Icons.Plus size={18} /> Añadir
        </button>
      </header>

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-outline-variant flex gap-4 bg-surface-container-low/20">
          <div className="relative w-64">
            <Icons.Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
            <select className="pl-10 pr-4 py-1.5 w-full bg-white border border-outline-variant rounded-lg text-xs focus:outline-none">
              <option>Todos los filtros</option>
              <option>Recientes</option>
              <option>Prioridad Alta</option>
            </select>
          </div>
          <div className="relative w-64">
            <Icons.Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
            <input type="text" placeholder="Buscar en esta vista..." className="pl-10 pr-4 py-1.5 w-full bg-white border border-outline-variant rounded-lg text-xs focus:outline-none" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low text-[10px] font-bold text-on-surface-variant uppercase tracking-widest border-b border-outline-variant">
                {columns.map((col, i) => (
                  <th key={i} className="px-6 py-4">{col.label}</th>
                ))}
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {data.map((item, i) => (
                <tr 
                  key={i} 
                  onClick={() => onRowClick && onRowClick(item)}
                  className={`hover:bg-surface-container-low/20 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((col, j) => (
                    <td key={j} className="px-6 py-4">
                      {col.render ? col.render(item[col.key], item) : (
                        <span className="text-sm text-on-surface">{item[col.key]}</span>
                      )}
                    </td>
                  ))}
                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <button className="text-on-surface-variant hover:text-brand-primary p-2 transition-colors">
                      <Icons.MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-outline-variant flex justify-between items-center">
          <span className="text-xs text-on-surface-variant">Mostrando 1-{data.length} de {data.length} registros</span>
          <div className="flex gap-1">
            <button className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container"><Icons.ChevronLeft size={16} /></button>
            <button className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container"><Icons.ChevronRight size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsView = () => {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h2 className="text-3xl font-bold text-on-surface">Configuración</h2>
        <p className="text-on-surface-variant mt-1">Personaliza tu entorno de CoimpactoB.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-4">
          {[
            { label: 'Perfil y Cuenta', icon: Icons.User },
            { label: 'Unidades de Negocio', icon: Icons.Briefcase },
            { label: 'Usuarios y Roles', icon: Icons.ShieldCheck },
            { label: 'Notificaciones', icon: Icons.Bell },
            { label: 'Integraciones', icon: Icons.Cpu },
          ].map((item, i) => (
            <button key={i} className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${i === 0 ? 'bg-blue-50 border-blue-200 text-brand-primary-container font-bold' : 'bg-white border-outline-variant hover:bg-surface-container'}`}>
              <div className="flex items-center gap-3">
                <item.icon size={20} />
                <span className="text-sm">{item.label}</span>
              </div>
              <Icons.ChevronRight size={16} />
            </button>
          ))}
        </div>

        <div className="md:col-span-2 glass-card p-8">
          <div className="flex items-center gap-6 mb-8">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-brand-primary-container/10 border-2 border-brand-primary-container flex items-center justify-center overflow-hidden">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Profile" className="w-full h-full object-cover" />
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-brand-primary-container text-white rounded-full shadow-lg">
                <Icons.Camera size={16} />
              </button>
            </div>
            <div>
              <h3 className="text-xl font-bold">Felix Admin</h3>
              <p className="text-sm text-on-surface-variant">felix@coimpacto.com</p>
              <span className="inline-block mt-2 px-2 py-1 bg-surface-container rounded-md text-[10px] font-bold uppercase text-on-surface-variant">Administrador Global</span>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Nombre Completo</label>
                <input type="text" defaultValue="Felix Admin" className="bg-surface border border-outline-variant rounded-xl p-3 text-sm focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Zona Horaria</label>
                <select className="bg-surface border border-outline-variant rounded-xl p-3 text-sm focus:outline-none">
                  <option>Bogotá, GMT-5</option>
                  <option>Mexico City, GMT-6</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Biografía de Impacto</label>
              <textarea defaultValue="Liderando el cambio sistémico a través de herramientas de gestión robustas." className="bg-surface border border-outline-variant rounded-xl p-3 text-sm focus:outline-none h-24 resize-none" />
            </div>
            <div className="pt-4 flex justify-end">
              <button className="bg-brand-primary-container text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-brand-primary-container/20">
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- View Router ---

const ViewRouter = ({ 
  currentView, 
  selectedOpportunity,
  onOpportunityClick,
  onBackToPipeline
}: { 
  currentView: ViewType, 
  selectedOpportunity: Opportunity | null,
  onOpportunityClick: (opp: Opportunity) => void,
  onBackToPipeline: () => void
}) => {
  const views: Record<ViewType, React.ReactNode> = {
    dashboard: <DashboardView onOpportunityClick={onOpportunityClick} />,
    pipeline: <PipelineView onOpportunityClick={onOpportunityClick} />,
    opportunities: <TableView 
      title="Oportunidades Activas" 
      data={MOCK_OPPORTUNITIES} 
      type="oportunidades"
      onRowClick={(row) => onOpportunityClick(row)}
      columns={[
        { label: 'Nombre / Empresa', key: 'name', render: (val, row) => (
          <div className="flex flex-col">
            <span className="text-sm font-bold text-brand-primary-container">{val}</span>
            <span className="text-[10px] text-on-surface-variant mt-0.5">{row.account}</span>
          </div>
        )},
        { label: 'Etapa', key: 'stage', render: (val) => (
          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase border border-blue-100">{val}</span>
        )},
        { label: 'Valor', key: 'value', render: (val) => <span className="text-sm font-bold">${val.toLocaleString()} USD</span> },
        { label: 'Unidad', key: 'unit' },
        { label: 'Vencimiento', key: 'dueDate' }
      ]}
    />,
    'opportunity-detail': selectedOpportunity ? (
      <OpportunityDetail opportunity={selectedOpportunity} onBack={onBackToPipeline} />
    ) : (
      <div className="p-8">Ocurrió un error al cargar la oportunidad.</div>
    ),
    accounts: <TableView 
      title="Directorio de Cuentas" 
      data={MOCK_ACCOUNTS} 
      type="cuentas" 
      columns={[
        { label: 'Cuenta', key: 'name', render: (val) => <span className="text-sm font-bold text-brand-primary-container">{val}</span> },
        { label: 'Industria', key: 'industry' },
        { label: 'Tamaño', key: 'size' },
        { label: 'País/Ciudad', key: 'country', render: (val, row) => <span className="text-sm">{val}, {row.city}</span> },
        { label: 'Responsable', key: 'owner' }
      ]}
    />,
    contacts: <TableView 
      title="Directorio de Contactos" 
      data={MOCK_USERS} 
      type="contactos" 
      columns={[
        { label: 'Nombre', key: 'name', render: (val, row) => (
          <div className="flex items-center gap-3">
            <img src={row.avatar} className="w-8 h-8 rounded-full border border-outline-variant" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-on-surface">{val}</span>
              <span className="text-[10px] text-on-surface-variant">{row.email}</span>
            </div>
          </div>
        )},
        { label: 'Rol', key: 'role' },
        { label: 'Unidad', key: 'unit' }
      ]}
    />,
    activities: <TableView 
      title="Gestión de Actividades" 
      data={MOCK_ACTIVITIES} 
      type="actividades" 
      columns={[
        { label: 'Actividad', key: 'title', render: (val, row) => (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-surface-container rounded-lg"><row.icon size={16} /></div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-on-surface">{val}</span>
              <span className="text-[10px] text-on-surface-variant">{row.type} • {row.entity}</span>
            </div>
          </div>
        )},
        { label: 'Hora/Fecha', key: 'time' },
        { label: 'Status', key: 'status', render: (val) => (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${val === 'completed' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-orange-50 text-orange-700 border border-orange-100'}`}>
            {val === 'completed' ? 'Completado' : 'Pendiente'}
          </span>
        )}
      ]}
    />,
    goals: <div className="p-8"><h2 className="text-2xl font-bold">Gestión de Metas de Impacto</h2><p>Definición de KPIs y OKRs por unidad...</p></div>,
    reports: <div className="p-8"><h2 className="text-2xl font-bold">Generador de Reportes</h2><p>Análisis avanzado y exportación de datos...</p></div>,
    settings: <SettingsView />,
  };

  return (
    <motion.div
      key={currentView}
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.2 }}
      className="flex-1 overflow-y-auto no-scrollbar"
    >
      <div className="container mx-auto p-8 lg:p-12 max-w-7xl">
        {views[currentView] || <div>Vista no encontrada</div>}
      </div>
    </motion.div>
  );
};

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpportunityClick = (opp: Opportunity) => {
    setSelectedOpportunity(opp);
    setCurrentView('opportunity-detail');
  };

  const handleBackToPipeline = () => {
    setCurrentView('opportunities');
  };

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        onNewOpportunity={() => setIsModalOpen(true)}
      />
      <main className="flex-1 ml-[240px] flex flex-col min-w-0">
        <TopNav />
        <AnimatePresence mode="wait">
          <ViewRouter 
            currentView={currentView} 
            selectedOpportunity={selectedOpportunity}
            onOpportunityClick={handleOpportunityClick}
            onBackToPipeline={handleBackToPipeline}
          />
        </AnimatePresence>
      </main>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Crear Nueva Oportunidad"
      >
        <NewOpportunityForm onSubmit={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
}
