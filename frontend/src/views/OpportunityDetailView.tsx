import React, { useEffect, useState } from 'react'
import { ArrowLeft, Plus, Building2, Globe, MapPin, StickyNote } from 'lucide-react'
import { api } from '../lib/api'
import { ActivityModal } from '../components/modals/ActivityModal'

const STAGE_LABELS: Record<string, string> = {
  PROSPECTO_IDENTIFICADO: 'Prospecto',
  SENAL_DETECTADA: 'Señal',
  PRIMER_CONTACTO: 'Primer Contacto',
  EN_SECUENCIA: 'En Secuencia',
  REUNION_AGENDADA: 'Reunión Agendada',
  PROPUESTA_ENVIADA: 'Propuesta',
  NEGOCIACION: 'Negociación',
  GANADO: 'Ganado',
  PERDIDO: 'Perdido',
}

const ALL_STAGES = [
  'PROSPECTO_IDENTIFICADO', 'SENAL_DETECTADA', 'PRIMER_CONTACTO',
  'EN_SECUENCIA', 'REUNION_AGENDADA', 'PROPUESTA_ENVIADA',
  'NEGOCIACION', 'GANADO', 'PERDIDO',
]

const ACT_ICON_LABELS: Record<string, string> = {
  EMAIL: '✉', CALL: '📞', MEETING: '🤝', LINKEDIN: 'in', NOTE: '📝',
}

interface Props { id: string; onBack: () => void }

export function OpportunityDetailView({ id, onBack }: Props) {
  const [deal, setDeal] = useState<any>(null)
  const [activities, setActivities] = useState<any[]>([])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [activityModal, setActivityModal] = useState(false)
  const [moving, setMoving] = useState(false)

  const loadActivities = () =>
    api.get(`/activities?dealId=${id}`).then(d => {
      if (d) setActivities(Array.isArray(d) ? d : d.data ?? [])
    })

  useEffect(() => {
    if (!id) return
    api.get(`/deals/${id}`).then(d => d && setDeal(d.data ?? d))
    loadActivities()
  }, [id])

  const saveNote = async () => {
    if (!note.trim()) return
    setSaving(true)
    await api.post('/activities', { dealId: id, type: 'NOTE', notes: note, outcome: 'Nota interna' })
    setNote('')
    await loadActivities()
    setSaving(false)
  }

  const moveStage = async (newStage: string) => {
    setMoving(true)
    const res = await api.post(`/deals/${id}/move-stage`, { stage: newStage })
    if (res) setDeal((prev: any) => ({ ...prev, stage: newStage }))
    setMoving(false)
  }

  if (!deal) return (
    <div className="flex items-center justify-center h-64 text-on-surface-variant">Cargando...</div>
  )

  const prospect = deal.prospect ?? {}

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <header className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-3xl font-bold text-on-surface">
              {(deal.serviceType ?? '').replace(/_/g, ' ')}
            </h2>
            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
              {STAGE_LABELS[deal.stage] ?? deal.stage}
            </span>
            <select
              value={deal.stage}
              onChange={e => moveStage(e.target.value)}
              disabled={moving}
              className="text-xs border border-outline-variant rounded-lg px-2 py-1 bg-surface focus:outline-none focus:border-brand-primary-container disabled:opacity-50"
            >
              {ALL_STAGES.map(s => (
                <option key={s} value={s}>{STAGE_LABELS[s] ?? s}</option>
              ))}
            </select>
          </div>
          <p className="text-on-surface-variant mt-1">{prospect.name ?? '—'}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left */}
        <div className="lg:col-span-2 space-y-8">
          {/* Key stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="glass-card p-6 border-l-4 border-l-brand-primary-container">
              <div className="text-xs font-bold text-on-surface-variant uppercase mb-1">Valor</div>
              <div className="text-2xl font-bold">${(deal.value ?? 0).toLocaleString('es-CO')} USD</div>
            </div>
            <div className="glass-card p-6 border-l-4 border-l-orange-400">
              <div className="text-xs font-bold text-on-surface-variant uppercase mb-1">Trimestre</div>
              <div className="text-2xl font-bold">{deal.quarter ?? '—'}</div>
            </div>
            <div className="glass-card p-6 border-l-4 border-l-green-500">
              <div className="text-xs font-bold text-on-surface-variant uppercase mb-1">Región</div>
              <div className="text-sm font-bold">{deal.region ?? prospect.region ?? '—'}</div>
            </div>
          </div>

          {/* Timeline */}
          <div className="glass-card">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center">
              <h3 className="font-bold text-lg">Línea de Tiempo</h3>
              <button
                onClick={() => setActivityModal(true)}
                className="flex items-center gap-1 text-brand-primary-container text-sm font-bold hover:opacity-80 transition-opacity"
              >
                <Plus size={16} /> Nueva Actividad
              </button>
            </div>
            <div className="p-6">
              {activities.length === 0 && (
                <p className="text-sm text-on-surface-variant">Sin actividades registradas.</p>
              )}
              <div className="relative">
                {activities.length > 0 && (
                  <div className="absolute left-[15px] top-4 bottom-4 w-px bg-outline-variant" />
                )}
                <div className="space-y-6">
                  {activities.map((act, i) => (
                    <div key={act.id ?? i} className="flex gap-4 items-start">
                      <div className="w-8 h-8 rounded-full bg-brand-primary-container text-white flex items-center justify-center text-xs font-bold shrink-0 relative z-10">
                        {ACT_ICON_LABELS[act.type] ?? act.type?.[0] ?? 'A'}
                      </div>
                      <div className="flex-1 pt-1">
                        <div className="flex justify-between items-start">
                          <h4 className="text-sm font-bold text-on-surface">
                            {act.type} — {act.outcome ?? '—'}
                          </h4>
                          <span className="text-[10px] text-on-surface-variant shrink-0 ml-2">
                            {act.doneAt ? new Date(act.doneAt).toLocaleDateString('es-CO') : ''}
                          </span>
                        </div>
                        {act.notes && (
                          <p className="text-xs text-on-surface-variant mt-1">{act.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="space-y-8">
          {/* Account card */}
          <div className="glass-card p-6 bg-brand-primary-container/5 border-brand-primary-container/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-white border border-outline-variant flex items-center justify-center">
                <Building2 className="text-brand-primary-container" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg">{prospect.name ?? '—'}</h3>
                <span className="text-xs text-on-surface-variant">{prospect.industry ?? 'Cliente'}</span>
              </div>
            </div>
            <div className="space-y-3">
              {prospect.website && (
                <div className="flex items-center gap-3 text-sm">
                  <Globe size={16} className="text-on-surface-variant shrink-0" />
                  <span className="text-brand-primary-container truncate">{prospect.website}</span>
                </div>
              )}
              {prospect.region && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin size={16} className="text-on-surface-variant shrink-0" />
                  <span>{prospect.region}</span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="glass-card">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center">
              <h3 className="font-bold text-lg">Notas de Impacto</h3>
              <StickyNote size={18} className="text-on-surface-variant" />
            </div>
            <div className="p-6">
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full h-32 bg-surface p-3 rounded-lg text-sm focus:outline-none border border-outline-variant focus:border-brand-primary-container resize-none"
                placeholder="Añadir notas internas sobre el impacto de esta oportunidad..."
              />
              <button
                onClick={saveNote}
                disabled={saving || !note.trim()}
                className="w-full mt-4 py-2 bg-brand-primary-container text-white rounded-lg text-sm font-bold shadow-sm disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar Nota'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ActivityModal
        isOpen={activityModal}
        dealId={id}
        prospectId={deal?.prospect?.id}
        onClose={() => setActivityModal(false)}
        onSaved={loadActivities}
      />
    </div>
  )
}
