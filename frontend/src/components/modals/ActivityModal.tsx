import React, { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { api } from '../../lib/api'

const ACTIVITY_TYPES = [
  { value: 'NOTE', label: 'Nota Interna' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'CALL', label: 'Llamada' },
  { value: 'MEETING', label: 'Reunión' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
]

interface Props {
  isOpen: boolean
  dealId: string
  prospectId?: string
  onClose: () => void
  onSaved: () => void
}

export function ActivityModal({ isOpen, dealId, prospectId, onClose, onSaved }: Props) {
  const [type, setType] = useState('NOTE')
  const [outcome, setOutcome] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const reset = () => { setOutcome(''); setNotes(''); setType('NOTE'); setError('') }

  const submit = async () => {
    if (!outcome.trim()) { setError('El resultado es requerido.'); return }
    setError('')
    setLoading(true)
    await api.post('/activities', {
      dealId,
      prospectId,
      type,
      outcome: outcome.trim(),
      notes,
    })
    reset()
    setLoading(false)
    onSaved()
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-[101] overflow-hidden"
          >
            <div className="flex justify-between items-center p-6 border-b border-outline-variant">
              <h3 className="text-lg font-bold text-on-surface">Registrar Actividad</h3>
              <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Tipo de Actividad</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value)}
                  className="bg-surface border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container"
                >
                  {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Resultado *</label>
                {error && <p className="text-xs text-red-600 ml-1">{error}</p>}
                <input
                  type="text"
                  value={outcome}
                  onChange={e => { setOutcome(e.target.value); if (error) setError('') }}
                  placeholder="ej. Reunión agendada para el lunes"
                  className={`bg-surface border rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container ${error ? 'border-red-400' : 'border-outline-variant'}`}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Notas</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="bg-surface border border-outline-variant rounded-xl p-3 text-sm h-24 resize-none focus:outline-none focus:border-brand-primary-container"
                  placeholder="Detalles de la actividad..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { reset(); onClose() }}
                  className="flex-1 py-3 bg-surface-container text-on-surface-variant rounded-xl font-bold hover:bg-outline-variant transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={submit}
                  disabled={loading}
                  className="flex-1 py-3 bg-brand-primary-container text-white rounded-xl font-bold shadow-lg shadow-brand-primary-container/20 disabled:opacity-50 active:scale-95 transition-all"
                >
                  {loading ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
