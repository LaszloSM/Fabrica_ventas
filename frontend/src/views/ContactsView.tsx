import React, { useEffect, useState } from 'react'
import { Search, Plus, X, User, Mail, Phone, Building2, Briefcase, Linkedin, MapPin, Filter } from 'lucide-react'
import { api } from '../lib/api'
import { AnimatePresence, motion } from 'motion/react'
import { ContactDetailPanel } from '../components/ContactDetailPanel'

function NewContactModal({ isOpen, onClose, onSaved }: {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', role: '',
    prospectSearch: '', prospectId: '',
    country: 'Colombia', city: '', impactAreas: '',
    temperature: '', linkedinUrl: '',
  })
  const [prospects, setProspects] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (form.prospectSearch.length < 2) { setProspects([]); return }
    setSearching(true)
    const t = setTimeout(() => {
      api.get(`/prospects?search=${encodeURIComponent(form.prospectSearch)}&limit=8`)
        .then(d => { setProspects(d?.data ?? []); setSearching(false) })
    }, 300)
    return () => clearTimeout(t)
  }, [form.prospectSearch])

  const submit = async () => {
    if (!form.name.trim()) { setError('El nombre es requerido'); return }
    setError('')
    setSaving(true)
    const body: any = {
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      role: form.role.trim() || undefined,
      prospectId: form.prospectId || undefined,
      country: form.country.trim() || 'Colombia',
      city: form.city.trim() || undefined,
      temperature: form.temperature || undefined,
      linkedinUrl: form.linkedinUrl.trim() || undefined,
      impactAreas: form.impactAreas.trim() || undefined,
    }
    const res = await api.post('/contacts', body)
    if (res) { onSaved(); onClose(); setForm({ name: '', email: '', phone: '', role: '', prospectSearch: '', prospectId: '', country: 'Colombia', city: '', impactAreas: '', temperature: '', linkedinUrl: '' }) }
    else setError('No se pudo crear el contacto. Intenta de nuevo.')
    setSaving(false)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-[101] overflow-hidden"
          >
            <div className="flex justify-between items-center p-6 border-b border-outline-variant">
              <h3 className="text-xl font-bold">Nuevo Contacto</h3>
              <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{error}</div>}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Nombre *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="Nombre completo"
                  className="border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Email</label>
                  <input value={form.email} onChange={e => set('email', e.target.value)}
                    placeholder="correo@empresa.com" type="email"
                    className="border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Teléfono</label>
                  <input value={form.phone} onChange={e => set('phone', e.target.value)}
                    placeholder="+57 300 000 0000"
                    className="border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Cargo / Rol</label>
                <input value={form.role} onChange={e => set('role', e.target.value)}
                  placeholder="Ej: Gerente Financiero, Director de Impacto..."
                  className="border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">País</label>
                  <input value={form.country} onChange={e => set('country', e.target.value)}
                    placeholder="Colombia"
                    className="border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Ciudad</label>
                  <input value={form.city} onChange={e => set('city', e.target.value)}
                    placeholder="Bogotá"
                    className="border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Temperatura</label>
                <select value={form.temperature} onChange={e => set('temperature', e.target.value)}
                  className="border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container">
                  <option value="">Sin clasificar</option>
                  <option value="CALIENTE">Caliente</option>
                  <option value="TIBIO">Tibio</option>
                  <option value="FRIO">Frío</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">LinkedIn URL</label>
                <input value={form.linkedinUrl} onChange={e => set('linkedinUrl', e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  className="border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Áreas de impacto</label>
                <input value={form.impactAreas} onChange={e => set('impactAreas', e.target.value)}
                  placeholder="Ej: Educación, Finanzas, Medio ambiente..."
                  className="border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Empresa (cuenta)</label>
                {form.prospectId ? (
                  <div className="flex items-center justify-between border border-green-300 bg-green-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-sm text-green-700 font-bold">
                      <Building2 size={14} /> {form.prospectSearch}
                    </div>
                    <button onClick={() => set('prospectId', '') || set('prospectSearch', '')} className="text-green-600 hover:text-green-800">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input value={form.prospectSearch} onChange={e => set('prospectSearch', e.target.value)}
                      placeholder="Buscar empresa..."
                      className="w-full border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container" />
                    {prospects.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-outline-variant rounded-xl shadow-lg z-10 overflow-hidden">
                        {prospects.map((p: any) => (
                          <button key={p.id} onClick={() => { set('prospectId', p.id); set('prospectSearch', p.name) }}
                            className="w-full text-left px-4 py-2.5 hover:bg-surface-container-low text-sm flex items-center gap-2 border-b border-outline-variant last:border-0">
                            <Building2 size={14} className="text-on-surface-variant" />
                            <span>{p.name}</span>
                            {p.industry && <span className="text-[10px] text-on-surface-variant ml-auto">{p.industry}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    {searching && <p className="text-xs text-on-surface-variant mt-1 ml-1">Buscando...</p>}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={onClose}
                  className="flex-1 py-3 bg-surface-container text-on-surface-variant rounded-xl font-bold hover:bg-outline-variant transition-colors">
                  Cancelar
                </button>
                <button onClick={submit} disabled={saving || !form.name.trim()}
                  className="flex-1 py-3 bg-brand-primary-container text-white rounded-xl font-bold disabled:opacity-50 shadow-lg shadow-brand-primary-container/20">
                  {saving ? 'Guardando...' : 'Crear Contacto'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

const PAGE_SIZE = 20

export function ContactsView() {
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(false)
  const [selectedPanel, setSelectedPanel] = useState<string | null>(null)
  const [temperature, setTemperature] = useState('')
  const [country, setCountry] = useState('')
  const [countries, setCountries] = useState<string[]>([])

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams({ limit: '500' })
    if (temperature) params.set('temperature', temperature)
    if (country)     params.set('country', country)
    api.get(`/contacts?${params.toString()}`).then(d => {
      if (d) setContacts(Array.isArray(d) ? d : d.data ?? [])
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [temperature, country])

  useEffect(() => {
    api.get('/contacts/countries').then(r => {
      if (r?.data) setCountries(r.data)
    })
  }, [])

  const filtered = search
    ? contacts.filter(c =>
        [c.name, c.email, c.phone, c.role, c.prospect?.name, c.prospectName]
          .some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase()))
      )
    : contacts

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="flex flex-col gap-6">
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-on-surface">Directorio de Contactos</h2>
          <p className="text-on-surface-variant mt-1">
            Personas clave dentro de cada cuenta — tomadores de decisión, referentes de impacto y aliados estratégicos.
          </p>
        </div>
        <button
          onClick={() => setModal(true)}
          className="bg-brand-primary-container text-white py-2.5 px-6 rounded-xl font-bold flex items-center gap-2 shadow-sm hover:bg-brand-primary transition-colors shrink-0"
        >
          <Plus size={18} /> Nuevo Contacto
        </button>
      </header>

      {/* Empty state with explanation */}
      {!loading && contacts.length === 0 && (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-brand-primary-container/10 flex items-center justify-center mx-auto mb-4">
            <User size={28} className="text-brand-primary-container" />
          </div>
          <h3 className="font-bold text-lg mb-2">Sin contactos registrados</h3>
          <p className="text-sm text-on-surface-variant max-w-md mx-auto mb-6">
            Los <strong>contactos</strong> son las personas dentro de cada empresa (cuenta) con quienes CoimpactoB interactúa:
            gerentes, directores, coordinadores de proyectos y otros tomadores de decisión.
          </p>
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-8 text-left">
            {[
              { icon: User, title: 'Persona', desc: 'Nombre, cargo y datos de contacto' },
              { icon: Building2, title: 'Empresa', desc: 'Vinculado a una cuenta del directorio' },
              { icon: Mail, title: 'Seguimiento', desc: 'Base para actividades y comunicaciones' },
            ].map(item => (
              <div key={item.title} className="p-3 bg-surface-container-low rounded-xl">
                <item.icon size={18} className="text-brand-primary-container mb-2" />
                <div className="text-xs font-bold">{item.title}</div>
                <div className="text-[10px] text-on-surface-variant mt-0.5">{item.desc}</div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setModal(true)}
            className="bg-brand-primary-container text-white py-3 px-8 rounded-xl font-bold shadow-lg shadow-brand-primary-container/20"
          >
            Crear Primer Contacto
          </button>
        </div>
      )}

      {(loading || contacts.length > 0) && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-outline-variant bg-surface-container-low/20 flex gap-3 items-center flex-wrap">
            <div className="relative w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Buscar contacto, empresa, ciudad..."
                className="pl-9 pr-4 py-1.5 w-full bg-white border border-outline-variant rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary-container" />
            </div>

            <select
              value={temperature}
              onChange={e => { setTemperature(e.target.value); setPage(1) }}
              className="border border-outline-variant rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none"
            >
              <option value="">Todas las temperaturas</option>
              <option value="CALIENTE">🔴 Caliente</option>
              <option value="TIBIO">🟡 Tibio</option>
              <option value="FRIO">🔵 Frío</option>
            </select>

            {countries.length > 0 && (
              <select
                value={country}
                onChange={e => { setCountry(e.target.value); setPage(1) }}
                className="border border-outline-variant rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none"
              >
                <option value="">Todos los países</option>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}

            <span className="text-xs text-on-surface-variant ml-auto">{contacts.length} contactos</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low text-[10px] font-bold text-on-surface-variant uppercase tracking-widest border-b border-outline-variant">
                  <th className="px-6 py-4">Contacto</th>
                  <th className="px-6 py-4">Cargo</th>
                  <th className="px-6 py-4">Empresa</th>
                  <th className="px-4 py-4">Ubicación</th>
                  <th className="px-4 py-4">Temperatura</th>
                  <th className="px-4 py-4">Secuencia</th>
                  <th className="px-4 py-4">LinkedIn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {loading ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-on-surface-variant">Cargando...</td></tr>
                ) : slice.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-on-surface-variant">Sin registros</td></tr>
                ) : slice.map((c, i) => {
                  const seq = c.sequence ?? {}
                  const doneCount = ['linkedinInviteSent','linkedinAccepted','linkedinMessage','email1','email2','email3','whatsapp','call','firstMeeting','followUpEmail','proposalPrep','proposalMeeting']
                    .filter(k => seq[k]?.done).length
                  const tempMeta: Record<string, { label: string; color: string }> = {
                    CALIENTE: { label: 'Caliente', color: 'bg-red-50 text-red-700 border-red-200' },
                    TIBIO:    { label: 'Tibio',    color: 'bg-amber-50 text-amber-700 border-amber-200' },
                    FRIO:     { label: 'Frío',     color: 'bg-blue-50 text-blue-700 border-blue-200' },
                  }
                  const temp = c.temperature ? tempMeta[c.temperature] : null

                  return (
                    <tr
                      key={c.id ?? i}
                      onClick={() => setSelectedPanel(c.id)}
                      className="hover:bg-surface-container-low/20 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-primary-container/10 flex items-center justify-center font-bold text-xs text-brand-primary-container shrink-0">
                            {(c.name ?? '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-on-surface">{c.name}</div>
                            {c.email && (
                              <div className="text-[10px] text-on-surface-variant flex items-center gap-1">
                                <Mail size={9} /> {c.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-on-surface-variant">
                          {c.role && <Briefcase size={12} />}
                          {c.role ?? '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm">
                          {(c.prospect?.name ?? c.prospectName) && <Building2 size={12} className="text-on-surface-variant shrink-0" />}
                          <span className="text-brand-primary-container font-medium">
                            {c.prospect?.name ?? c.prospectName ?? '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {(c.city || c.country)
                          ? <div className="flex items-center gap-1 text-xs text-on-surface-variant">
                              <MapPin size={11} />
                              {[c.city, c.country].filter(Boolean).join(', ')}
                            </div>
                          : <span className="text-sm text-on-surface-variant">—</span>
                        }
                      </td>
                      <td className="px-4 py-4">
                        {temp
                          ? <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${temp.color}`}>{temp.label}</span>
                          : <span className="text-sm text-on-surface-variant">—</span>
                        }
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-surface-container rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-primary-container rounded-full"
                              style={{ width: `${(doneCount / 12) * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-on-surface-variant">{doneCount}/12</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {c.linkedinUrl
                          ? <a href={c.linkedinUrl} target="_blank" rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                              <Linkedin size={13} />
                            </a>
                          : <span className="text-sm text-on-surface-variant">—</span>
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-outline-variant flex justify-between items-center">
            <span className="text-xs text-on-surface-variant">Mostrando {slice.length} de {filtered.length}</span>
            {totalPages > 1 && (
              <div className="flex gap-1 items-center">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                  className="px-3 py-1 border border-outline-variant rounded-lg text-xs hover:bg-surface-container disabled:opacity-40">
                  ‹ Anterior
                </button>
                <span className="px-3 text-xs font-bold">{page}/{totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="px-3 py-1 border border-outline-variant rounded-lg text-xs hover:bg-surface-container disabled:opacity-40">
                  Siguiente ›
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <NewContactModal isOpen={modal} onClose={() => setModal(false)} onSaved={load} />

      <ContactDetailPanel
        contactId={selectedPanel}
        onClose={() => setSelectedPanel(null)}
      />
    </div>
  )
}
