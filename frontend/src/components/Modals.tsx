import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as Icons from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-[101] overflow-hidden"
          >
            <div className="flex justify-between items-center p-6 border-b border-outline-variant">
              <h3 className="text-xl font-bold text-on-surface">{title}</h3>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant"
              >
                <Icons.X size={20} />
              </button>
            </div>
            <div className="p-6">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export const NewOpportunityForm = ({ onSubmit }: { onSubmit: () => void }) => {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Nombre de la Oportunidad</label>
          <input type="text" placeholder="Ej: Expansión BIC 2024" className="w-full bg-surface border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Cuenta / Cliente</label>
          <select className="w-full bg-surface border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container">
            <option>Seleccionar cuenta...</option>
            <option>Logística Global SA</option>
            <option>Fundación Vida Verde</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Valor (USD)</label>
          <input type="number" placeholder="0.00" className="w-full bg-surface border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Unidad de Negocio</label>
          <select className="w-full bg-surface border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container">
            <option>SAS BIC</option>
            <option>Fundación</option>
            <option>Lab Innovación</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Descripción de Impacto</label>
        <textarea placeholder="Describe el objetivo social o ambiental..." className="w-full bg-surface border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container h-24 resize-none" />
      </div>

      <div className="pt-4 flex gap-3">
        <button className="flex-1 py-3 bg-surface-container text-on-surface-variant rounded-xl font-bold transition-colors hover:bg-outline-variant">
          Cancelar
        </button>
        <button 
          onClick={onSubmit}
          className="flex-1 py-3 bg-brand-primary-container text-white rounded-xl font-bold shadow-lg shadow-brand-primary-container/20 active:scale-95 transition-all"
        >
          Crear Registro
        </button>
      </div>
    </div>
  );
};
