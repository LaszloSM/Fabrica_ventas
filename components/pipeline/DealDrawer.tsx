'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Activity, CheckCircle, Mail, Phone, User, FileText,
  Calendar, DollarSign, UserCircle, Tag, Flame, TrendingUp,
  Building2, MapPin, X
} from 'lucide-react'
import type { DealWithRelations } from '@/types'
import { ActivityType } from '@/types'

interface DealDrawerProps {
  deal: DealWithRelations
  onClose: () => void
  onUpdate: (updated: DealWithRelations) => void
}

const activityConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  EMAIL: { icon: Mail, color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
  CALL: { icon: Phone, color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
  MEETING: { icon: User, color: '#f26522', bg: 'rgba(242,101,34,0.15)' },
  NOTE: { icon: FileText, color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
  LINKEDIN: { icon: CheckCircle, color: '#818cf8', bg: 'rgba(129,140,248,0.15)' },
}

export function DealDrawer({ deal, onClose, onUpdate }: DealDrawerProps) {
  const [loading, setLoading] = useState(false)
  const [activity, setActivity] = useState<{ type: ActivityType; notes: string }>({
    type: ActivityType.NOTE,
    notes: '',
  })

  const prospectName = deal.prospect?.name || 'Sin organización'
  const contactName = deal.contact?.name
  const assignedName = deal.assignedUser?.name || deal.assignedTo || 'Sin asignar'

  async function logActivity(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: deal.id, ...activity }),
      })
      if (res.ok) {
        const json = await res.json()
        const newActivity = json.data
        onUpdate({
          ...deal,
          activities: [...(deal.activities || []), newActivity],
        })
        setActivity({ type: ActivityType.NOTE, notes: '' })
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  const sortedActivities = [...(deal.activities || [])].sort(
    (a, b) => new Date(b.doneAt || b.createdAt).getTime() - new Date(a.doneAt || a.createdAt).getTime()
  )

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a2e]/95 backdrop-blur-xl shadow-2xl shadow-black/50">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-bold text-white truncate">{prospectName}</DialogTitle>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge variant="secondary" className="text-[10px] bg-white/10 text-white/60 border-0">
                  {deal.serviceType?.replace(/_/g, ' ')}
                </Badge>
                <Badge className="text-[10px] border-0 bg-gradient-to-r from-[#f26522]/20 to-[#d5551a]/20 text-[#f26522]">
                  {deal.stage?.replace(/_/g, ' ')}
                </Badge>
                {deal.value && (
                  <Badge className="text-[10px] border-0 bg-emerald-500/20 text-emerald-400">
                    ${deal.value.toLocaleString()}
                  </Badge>
                )}
              </div>
            </div>
            {deal.value && (
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-bold text-emerald-400">${deal.value.toLocaleString()}</p>
                <p className="text-[10px] text-white/40">Valor del deal</p>
              </div>
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="timeline" className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-4">
            <TabsList className="w-full bg-white/5 border border-white/10 p-1 rounded-xl">
              <TabsTrigger value="timeline" className="flex-1 text-xs data-[state=active]:bg-white/10 data-[state=active]:text-[#f26522] text-white/60 rounded-lg transition-all">
                <Activity className="w-3.5 h-3.5 mr-1.5" />
                Timeline ({sortedActivities.length})
              </TabsTrigger>
              <TabsTrigger value="info" className="flex-1 text-xs data-[state=active]:bg-white/10 data-[state=active]:text-[#f26522] text-white/60 rounded-lg transition-all">
                <UserCircle className="w-3.5 h-3.5 mr-1.5" />
                Info
              </TabsTrigger>
              <TabsTrigger value="notes" className="flex-1 text-xs data-[state=active]:bg-white/10 data-[state=active]:text-[#f26522] text-white/60 rounded-lg transition-all">
                <FileText className="w-3.5 h-3.5 mr-1.5" />
                Notas
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 px-6 py-4">
            <TabsContent value="timeline" className="mt-0 space-y-4">
              {sortedActivities.length === 0 && (
                <div className="text-center py-8">
                  <Activity className="mx-auto h-8 w-8 text-white/10 mb-2" />
                  <p className="text-sm text-white/40">Sin actividades registradas</p>
                </div>
              )}
              {sortedActivities.map((act, i) => {
                const config = activityConfig[act.type] || activityConfig.NOTE
                const Icon = config.icon
                const date = act.doneAt
                  ? new Date(act.doneAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
                  : ''

                return (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: config.bg }}>
                        <Icon className="h-4 w-4" style={{ color: config.color }} />
                      </div>
                      {i < sortedActivities.length - 1 && <div className="mt-1 h-full w-px bg-white/10" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-white">{act.type}</p>
                        {date && <p className="text-[10px] text-white/30">{date}</p>}
                      </div>
                      {act.notes && <p className="text-sm text-white/50 mt-1">{act.notes}</p>}
                      {act.outcome && (
                        <Badge variant="outline" className="text-[10px] mt-1.5 border-white/10 text-white/40">
                          {act.outcome}
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </TabsContent>

            <TabsContent value="info" className="mt-0 space-y-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Detalles del Deal</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-white/30 text-xs mb-0.5">Etapa</p>
                    <p className="font-medium text-white">{deal.stage?.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <p className="text-white/30 text-xs mb-0.5">Valor</p>
                    <p className="font-medium text-emerald-400">${deal.value?.toLocaleString() || 0}</p>
                  </div>
                  <div>
                    <p className="text-white/30 text-xs mb-0.5">Responsable</p>
                    <p className="font-medium text-white">{assignedName}</p>
                  </div>
                  <div>
                    <p className="text-white/30 text-xs mb-0.5">Región</p>
                    <p className="font-medium text-white">{deal.region || '—'}</p>
                  </div>
                </div>
              </div>

              {deal.contact && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                  <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Contacto Principal</h4>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#f26522] to-[#d5551a] text-sm font-bold text-white">
                      {contactName?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{contactName || 'Sin nombre'}</p>
                      {deal.contact.email && <p className="text-xs text-white/40">{deal.contact.email}</p>}
                      {deal.contact.phone && <p className="text-xs text-white/40">{deal.contact.phone}</p>}
                    </div>
                  </div>
                </div>
              )}

              {deal.prospect && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                  <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Organización</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-white/30" />
                      <span className="text-sm text-white">{deal.prospect.name}</span>
                    </div>
                    {deal.prospect.industry && (
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-white/30" />
                        <span className="text-sm text-white/60">{deal.prospect.industry}</span>
                      </div>
                    )}
                    {deal.prospect.region && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-white/30" />
                        <span className="text-sm text-white/60">{deal.prospect.region}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes" className="mt-0">
              <form onSubmit={logActivity} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="flex h-9 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-sm text-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f26522]/50"
                    value={activity.type}
                    onChange={(e) => setActivity({ ...activity, type: e.target.value as ActivityType })}
                  >
                    <option value={ActivityType.NOTE}>Nota</option>
                    <option value={ActivityType.EMAIL}>Email</option>
                    <option value={ActivityType.CALL}>Llamada</option>
                    <option value={ActivityType.LINKEDIN}>LinkedIn</option>
                    <option value={ActivityType.MEETING}>Reunión</option>
                  </select>
                  <Button type="submit" disabled={loading} className="bg-gradient-to-r from-[#f26522] to-[#d5551a] hover:from-[#d5551a] hover:to-[#b54514] text-white border-0 rounded-xl">
                    {loading ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
                <Textarea
                  placeholder="Escribe los detalles de la actividad..."
                  value={activity.notes}
                  onChange={(e) => setActivity({ ...activity, notes: e.target.value })}
                  className="text-sm border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-[#f26522]/50 rounded-xl"
                  rows={4}
                />
              </form>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
