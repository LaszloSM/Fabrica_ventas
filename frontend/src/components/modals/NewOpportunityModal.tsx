import React, { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { api } from '../../lib/api'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const SERVICE_TYPES = [
  { value: 'CREDIMPACTO_GRUPOS', label: 'CredImpacto Grupos' },
  { value: 'CREDIMPACTO_CREDITOS', label: 'CredImpacto Créditos' },
  { value: 'CREDIMPACTO_FONDO_ROTATORIO', label: 'Fondo Rotatorio' },
  { value: 'CREDIMPACTO_PROVEEDORES', label: 'Proveedores' },
  { value: 'ACADEMIA_CURSO', label: 'Academia Curso' },
  { value: 'CONSULTORIA_PROYECTO', label: 'Consultoría Proyecto' },
  { value: 'FUNDACION_CONVENIO', label: 'Fundación Convenio' },
  { value: 'FUNDACION_CONVOCATORIA', label: 'Convocatoria' },
  { value: 'FUNDACION_FUNDRAISING', label: 'Fundraising' },
  { value: 'FUNDACION_EXPERIENCIA', label: 'Experiencia' },
]

const INITIAL_FORM = {
  prospectName: '',
  value: '',
  serviceType: 'CREDIMPACTO_GRUPOS',
  notes: '',
}

export function NewOpportunityModal({ isOpen, onClose }: Props) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.prospectName.trim()) { setError('El nombre de cuenta es requerido'); return }
    setError('')
    setLoading(true)
    try {
      // Create prospect first (backend wraps in { data: {...} })
      const prospectRes = await api.post('/prospects', {
        name: form.prospectName.trim(),
        industry: 'General',
        size: 'PEQUEÑA',
        region: 'Colombia',
      })
      const prospect = prospectRes?.data ?? prospectRes
      if (!prospect?.id) { setError('No se pudo crear la cuenta. Intenta de nuevo.'); return }

      // Create deal
      const deal = await api.post('/deals', {
        prospectId: prospect.id,
        serviceType: form.serviceType,
        value: parseFloat(form.value) || 0,
        stage: 'PROSPECTO_IDENTIFICADO',
      })
      if (!deal) { setError('No se pudo crear la oportunidad. Intenta de nuevo.'); return }

      setForm(INITIAL_FORM)
      onClose()
    } catch {
      setError('Error inesperado. Revisa la conexión al backend.')
    } finally {
      setLoading(false)
    }
  }

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
              <h3 className="text-xl font-bold text-on-surface">Crear Nueva Oportunidad</h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{error}</div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Cuenta / Cliente *</label>
                  <input
                    type="text"
                    value={form.prospectName}
                    onChange={e => set('prospectName', e.target.value)}
                    placeholder="Nombre de la empresa"
                    className="bg-surface border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Valor (USD)</label>
                  <input
                    type="number"
                    value={form.value}
                    onChange={e => set('value', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    className="bg-surface border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Unidad de Negocio</label>
                  <select
                    value={form.serviceType}
                    onChange={e => set('serviceType', e.target.value)}
                    className="bg-surface border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container"
                  >
                    {SERVICE_TYPES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Descripción de Impacto</label>
                <textarea
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  placeholder="Describe el objetivo social o ambiental de esta oportunidad..."
                  className="bg-surface border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container h-24 resize-none"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-surface-container text-on-surface-variant rounded-xl font-bold hover:bg-outline-variant transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={submit}
                  disabled={loading || !form.prospectName.trim()}
                  className="flex-1 py-3 bg-brand-primary-container text-white rounded-xl font-bold shadow-lg shadow-brand-primary-container/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Crear Registro'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
