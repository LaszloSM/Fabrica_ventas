import React from 'react';
import { motion } from 'motion/react';
import * as Icons from 'lucide-react';
import { Opportunity } from '../constants';

interface DetailProps {
  opportunity: Opportunity;
  onBack: () => void;
}

export const OpportunityDetail = ({ opportunity, onBack }: DetailProps) => {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant"
        >
          <Icons.ArrowLeft size={24} />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold text-on-surface">{opportunity.name}</h2>
            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
              {opportunity.stage}
            </span>
          </div>
          <p className="text-on-surface-variant mt-1">ID: {opportunity.id} • {opportunity.account}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Key Stats & Info */}
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card p-6 border-l-4 border-l-brand-primary-container">
              <div className="text-xs font-bold text-on-surface-variant uppercase mb-1">Valor Estimado</div>
              <div className="text-2xl font-bold text-on-surface">${opportunity.value.toLocaleString()} COP</div>
            </div>
            <div className="glass-card p-6 border-l-4 border-l-brand-secondary">
              <div className="text-xs font-bold text-on-surface-variant uppercase mb-1">Probabilidad</div>
              <div className="text-2xl font-bold text-on-surface">{opportunity.probability}%</div>
            </div>
            <div className="glass-card p-6 border-l-4 border-l-brand-tertiary">
              <div className="text-xs font-bold text-on-surface-variant uppercase mb-1">Próxima Acción</div>
              <div className="text-sm font-bold text-on-surface">{opportunity.nextAction}</div>
              <div className="text-[10px] text-on-surface-variant mt-1">{opportunity.dueDate}</div>
            </div>
          </div>

          <div className="glass-card">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center">
              <h3 className="font-bold text-lg">Información General</h3>
              <button className="text-brand-primary-container text-sm font-bold hover:underline">Editar</button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-y-6 gap-x-12">
              <div>
                <span className="text-xs font-bold text-on-surface-variant uppercase block mb-1">Responsable</span>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center font-bold text-xs">CM</div>
                  <span className="text-sm font-medium">{opportunity.owner}</span>
                </div>
              </div>
              <div>
                <span className="text-xs font-bold text-on-surface-variant uppercase block mb-1">Unidad de Negocio</span>
                <span className="text-sm font-medium">{opportunity.unit}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-on-surface-variant uppercase block mb-1">Fecha de Cierre Estimada</span>
                <span className="text-sm font-medium">15 de Noviembre, 2024</span>
              </div>
              <div>
                <span className="text-xs font-bold text-on-surface-variant uppercase block mb-1">Origen</span>
                <span className="text-sm font-medium">Recomendación Directa</span>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center">
              <h3 className="font-bold text-lg">Línea de Tiempo y Actividades</h3>
              <button className="flex items-center gap-1 text-brand-primary-container text-sm font-bold">
                <Icons.Plus size={16} /> Nueva Actividad
              </button>
            </div>
            <div className="p-6 relative">
              <div className="absolute left-[39px] top-8 bottom-8 w-px bg-outline-variant" />
              <div className="space-y-8">
                {[
                  { title: 'Propuesta Enviada', date: 'Hoy, 10:45 AM', user: 'Carlos Mendoza', icon: Icons.FileCheck, type: 'completed' },
                  { title: 'Reunión de Diagnóstico', date: 'Ayer, 03:20 PM', user: 'Ana Silva', icon: Icons.Users, type: 'completed' },
                  { title: 'Interés Inicial Registrado', date: '21 Oct, 09:12 AM', user: 'Sistema', icon: Icons.Flag, type: 'completed' },
                ].map((act, i) => (
                  <div key={i} className="flex gap-6 items-start relative z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-sm ${
                      act.type === 'completed' ? 'bg-brand-primary-container text-white' : 'bg-surface-container text-on-surface-variant'
                    }`}>
                      <act.icon size={14} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="text-sm font-bold text-on-surface">{act.title}</h4>
                        <span className="text-[10px] text-on-surface-variant font-medium">{act.date}</span>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-1">Realizado por: <span className="font-bold">{act.user}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Account Info & Notes */}
        <div className="space-y-8">
          <div className="glass-card p-6 bg-brand-primary-container/5 border-brand-primary-container/20">
             <div className="flex items-center gap-3 mb-6">
               <div className="w-12 h-12 rounded-xl bg-white border border-outline-variant flex items-center justify-center">
                 <Icons.Building2 className="text-brand-primary-container" size={24} />
               </div>
               <div>
                 <h3 className="font-bold text-lg">{opportunity.account}</h3>
                 <span className="text-xs text-on-surface-variant">Cliente Estratégico</span>
               </div>
             </div>
             
             <div className="space-y-4">
               <div className="flex items-center gap-3 text-sm">
                 <Icons.Globe size={16} className="text-on-surface-variant" />
                 <a href="#" className="text-brand-primary-container hover:underline">www.logisticaglobal.com</a>
               </div>
               <div className="flex items-center gap-3 text-sm">
                 <Icons.MapPin size={16} className="text-on-surface-variant" />
                 <span className="text-on-surface">Bogotá, Colombia</span>
               </div>
               <div className="flex items-center gap-3 text-sm">
                 <Icons.Phone size={16} className="text-on-surface-variant" />
                 <span className="text-on-surface">+57 300 123 4567</span>
               </div>
             </div>

             <button className="w-full mt-8 py-2 bg-white border border-outline-variant rounded-lg text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-all">
                Ver Ficha de Cliente
             </button>
          </div>

          <div className="glass-card">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center">
              <h3 className="font-bold text-lg">Notas de Impacto</h3>
              <Icons.StickyNote size={18} className="text-on-surface-variant" />
            </div>
            <div className="p-6">
              <textarea 
                className="w-full h-32 bg-surface p-3 rounded-lg text-sm focus:outline-none border border-outline-variant focus:border-brand-primary-container resize-none"
                placeholder="Añadir notas internas sobre el impacto de esta oportunidad..."
              ></textarea>
              <button className="w-full mt-4 py-2 bg-brand-primary-container text-white rounded-lg text-sm font-bold shadow-sm">
                Guardar Nota
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
