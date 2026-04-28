import React, { useEffect, useState } from 'react'
import { X, Linkedin, Mail, Phone, MapPin, Target, ExternalLink, Building2 } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { api } from '../lib/api'

const SEQUENCE_STEPS: { key: string; label: string }[] = [
  { key: 'linkedinInviteSent', label: 'Invitación LinkedIn enviada' },
  { key: 'linkedinAccepted',   label: 'LinkedIn aceptado' },
  { key: 'linkedinMessage',    label: 'Mensaje LinkedIn' },
  { key: 'email1',             label: 'Correo 1' },
  { key: 'email2',             label: 'Correo 2' },
  { key: 'email3',             label: 'Correo 3' },
  { key: 'whatsapp',           label: 'WhatsApp' },
  { key: 'call',               label: 'Llamada' },
  { key: 'firstMeeting',       label: 'Primera reunión' },
  { key: 'followUpEmail',      label: 'Mail de seguimiento' },
  { key: 'proposalPrep',       label: 'Preparación de propuesta' },
  { key: 'proposalMeeting',    label: 'Reunión de propuesta' },
]

const TEMP_META: Record<string, { label: string; color: string }> = {
  CALIENTE: { label: 'Caliente', color: 'bg-red-50 text-red-700 border-red-200' },
  TIBIO:    { label: 'Tibio',    color: 'bg-amber-50 text-amber-700 border-amber-200' },
  FRIO:     { label: 'Frío',     color: 'bg-blue-50 text-blue-700 border-blue-200' },
}

const STAGE_LABELS: Record<string, string> = {
  PROSPECTO_IDENTIFICADO: 'Prospecto', SENAL_DETECTADA: 'Señal',
  PRIMER_CONTACTO: 'Primer Contacto', EN_SECUENCIA: 'En Secuencia',
  REUNION_AGENDADA: 'Reunión Agendada', PROPUESTA_ENVIADA: 'Propuesta',
  NEGOCIACION: 'Negociación', GANADO: 'Ganado', PERDIDO: 'Perdido',
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

interface Props {
  contactId: string | null
  onClose: () => void
}

export function ContactDetailPanel({ contactId, onClose }: Props) {
  const [contact, setContact] = useState<any>(null)
  const [deals, setDeals] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [toggling, setToggling] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>({})

  useEffect(() => {
    if (!contactId) return
    setContact(null)
    setDeals([])
    setActivities([])

    api.get(`/contacts/${contactId}`).then(r => {
      if (r?.data) {
        setContact(r.data)
        setForm({
          name: r.data.name ?? '',
          role: r.data.role ?? '',
          email: r.data.email ?? '',
          phone: r.data.phone ?? '',
          country: r.data.country ?? '',
          city: r.data.city ?? '',
          impactAreas: r.data.impactAreas ?? '',
          temperature: r.data.temperature ?? '',
          notes: r.data.notes ?? '',
          linkedinUrl: r.data.linkedinUrl ?? '',
        })

        if (r.data.prospectId) {
          api.get(`/deals?limit=20`).then(dr => {
            const all = dr?.data ?? []
            setDeals(all.filter((d: any) => d.prospectId === r.data.prospectId && d.stage !== 'PERDIDO'))
          })
          api.get(`/activities?prospectId=${r.data.prospectId}&limit=5`).then(ar => {
            setActivities(ar?.data ?? [])
          })
        }
      }
    })
  }, [contactId])

  const toggleStep = async (step: string, currentDone: boolean) => {
    if (!contact) return
    setToggling(step)
    const res = await api.post(`/contacts/${contact.id}/sequence/${step}`, { done: !currentDone })
    if (res?.data) setContact(res.data)
    setToggling(null)
  }

  const saveEdit = async () => {
    if (!contact) return
    const res = await api.patch(`/contacts/${contact.id}`, form)
    if (res?.data) { setContact(res.data); setEditing(false) }
  }

  const seq = contact?.sequence ?? {}
  const doneCount = SEQUENCE_STEPS.filter(s => seq[s.key]?.done).length

  return (
    <AnimatePresence>
      {contactId && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 z-40"
          />

          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant shrink-0">
              <span className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Perfil de Contacto</span>
              <button onClick={onClose} className="p-1.5 hover:bg-surface-container rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            {!contact ? (
              <div className="flex-1 flex items-center justify-center text-sm text-on-surface-variant">Cargando...</div>
            ) : (
              <div className="flex-1 overflow-y-auto">

                {/* Identity */}
                <div className="px-6 py-5 border-b border-outline-variant">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-brand-primary-container/10 flex items-center justify-center font-bold text-lg text-brand-primary-container shrink-0">
                      {(contact.name ?? '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-lg text-on-surface">{contact.name}</div>
                      {contact.role && <div className="text-sm text-on-surface-variant">{contact.role}</div>}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {contact.temperature && TEMP_META[contact.temperature] && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${TEMP_META[contact.temperature].color}`}>
                            {TEMP_META[contact.temperature].label}
                          </span>
                        )}
                        {contact.prospectName && (
                          <span className="flex items-center gap-1 text-xs text-brand-primary-container font-medium">
                            <Building2 size={11} /> {contact.prospectName}
                          </span>
                        )}
                        {contact.linkedinUrl && (
                          <a href={contact.linkedinUrl} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            <Linkedin size={11} /> LinkedIn <ExternalLink size={9} />
                          </a>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setEditing(e => !e)}
                      className="shrink-0 text-xs text-on-surface-variant border border-outline-variant px-2 py-1 rounded-lg hover:bg-surface-container"
                    >
                      {editing ? 'Cancelar' : 'Editar'}
                    </button>
                  </div>
                </div>

                {/* Editable Info */}
                {editing ? (
                  <div className="px-6 py-4 border-b border-outline-variant space-y-3">
                    {[
                      { label: 'Nombre', key: 'name' },
                      { label: 'Cargo', key: 'role' },
                      { label: 'Email', key: 'email' },
                      { label: 'Teléfono', key: 'phone' },
                      { label: 'País', key: 'country' },
                      { label: 'Ciudad', key: 'city' },
                      { label: 'Áreas de impacto', key: 'impactAreas' },
                      { label: 'LinkedIn', key: 'linkedinUrl' },
                    ].map(f => (
                      <div key={f.key} className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-on-surface-variant uppercase">{f.label}</label>
                        <input
                          value={form[f.key] ?? ''}
                          onChange={e => setForm((prev: any) => ({ ...prev, [f.key]: e.target.value }))}
                          className="border border-outline-variant rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-brand-primary-container"
                        />
                      </div>
                    ))}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase">Temperatura</label>
                      <select
                        value={form.temperature ?? ''}
                        onChange={e => setForm((prev: any) => ({ ...prev, temperature: e.target.value }))}
                        className="border border-outline-variant rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                      >
                        <option value="">Sin clasificar</option>
                        <option value="CALIENTE">Caliente</option>
                        <option value="TIBIO">Tibio</option>
                        <option value="FRIO">Frío</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase">Comentarios</label>
                      <textarea
                        value={form.notes ?? ''}
                        onChange={e => setForm((prev: any) => ({ ...prev, notes: e.target.value }))}
                        rows={3}
                        className="border border-outline-variant rounded-lg px-3 py-1.5 text-sm focus:outline-none resize-none"
                      />
                    </div>
                    <button
                      onClick={saveEdit}
                      className="w-full py-2 bg-brand-primary-container text-white rounded-lg text-sm font-bold"
                    >
                      Guardar Cambios
                    </button>
                  </div>
                ) : (
                  <div className="px-6 py-4 border-b border-outline-variant space-y-2">
                    {contact.email && (
                      <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                        <Mail size={13} /> {contact.email}
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                        <Phone size={13} /> {contact.phone}
                      </div>
                    )}
                    {(contact.city || contact.country) && (
                      <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                        <MapPin size={13} />
                        {[contact.city, contact.country].filter(Boolean).join(', ')}
                      </div>
                    )}
                    {contact.impactAreas && (
                      <div className="flex items-start gap-2 text-sm text-on-surface-variant">
                        <Target size={13} className="shrink-0 mt-0.5" />
                        <span>{contact.impactAreas}</span>
                      </div>
                    )}
                    {contact.notes && (
                      <div className="mt-2 p-3 bg-surface-container-low rounded-lg text-xs text-on-surface-variant">
                        {contact.notes}
                      </div>
                    )}
                  </div>
                )}

                {/* Sequence Checklist */}
                <div className="px-6 py-4 border-b border-outline-variant">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                      Secuencia de Contacto
                    </span>
                    <span className="text-xs font-bold text-brand-primary-container">
                      {doneCount}/{SEQUENCE_STEPS.length}
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-surface-container rounded-full mb-3 overflow-hidden">
                    <div
                      className="h-full bg-brand-primary-container rounded-full transition-all"
                      style={{ width: `${(doneCount / SEQUENCE_STEPS.length) * 100}%` }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    {SEQUENCE_STEPS.map(({ key, label }) => {
                      const step = seq[key] ?? { done: false, doneAt: null }
                      const isLoading = toggling === key
                      return (
                        <button
                          key={key}
                          onClick={() => toggleStep(key, step.done)}
                          disabled={isLoading}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                            step.done
                              ? 'bg-green-50 hover:bg-green-100'
                              : 'hover:bg-surface-container-low'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            step.done
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-outline-variant'
                          }`}>
                            {step.done && !isLoading && <span className="text-[10px] font-bold">✓</span>}
                            {isLoading && <span className="text-[10px]">…</span>}
                          </div>
                          <span className={`text-xs flex-1 ${step.done ? 'text-green-700 font-medium' : 'text-on-surface-variant'}`}>
                            {label}
                          </span>
                          {step.done && step.doneAt && (
                            <span className="text-[10px] text-green-600 shrink-0">{fmtDate(step.doneAt)}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Associated Deals */}
                {deals.length > 0 && (
                  <div className="px-6 py-4 border-b border-outline-variant">
                    <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3 block">
                      Oportunidades ({deals.length})
                    </span>
                    <div className="space-y-2">
                      {deals.map((d: any) => (
                        <div key={d.id} className="flex items-center justify-between text-xs">
                          <span className="text-on-surface">{d.serviceType?.replace(/_/g, ' ')}</span>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold uppercase">
                              {STAGE_LABELS[d.stage] ?? d.stage}
                            </span>
                            <span className="font-bold text-on-surface">
                              {d.value != null ? `$${(d.value as number).toLocaleString('es-CO')}` : '—'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Activities */}
                {activities.length > 0 && (
                  <div className="px-6 py-4">
                    <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3 block">
                      Actividades Recientes
                    </span>
                    <div className="space-y-2">
                      {activities.slice(0, 5).map((a: any) => (
                        <div key={a.id ?? a._id} className="flex items-start gap-3 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-brand-primary-container mt-1.5 shrink-0" />
                          <div>
                            <span className="font-bold text-on-surface">{a.type?.replace('SEQ_', '')}</span>
                            {a.notes && <span className="text-on-surface-variant ml-1">— {a.notes}</span>}
                            <div className="text-on-surface-variant mt-0.5">{fmtDate(a.doneAt)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
