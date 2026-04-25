'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Activity, CheckCircle, Mail, Phone, User, FileText, X,
  Calendar, DollarSign, UserCircle, Tag
} from 'lucide-react'
import { colors, shadows } from '@/lib/design-system'
import type { DealWithRelations } from '@/types'
import { ActivityType } from '@/types'

interface DealDrawerProps {
  deal: DealWithRelations
  onClose: () => void
  onUpdate: (updated: DealWithRelations) => void
}

const activityConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  EMAIL: { icon: Mail, color: colors.info, bg: colors.infoLight },
  CALL: { icon: Phone, color: colors.success, bg: colors.successLight },
  MEETING: { icon: User, color: colors.primary, bg: colors.primaryLight },
  NOTE: { icon: FileText, color: colors.warning, bg: colors.warningLight },
  LINKEDIN: { icon: CheckCircle, color: colors.cold, bg: colors.coldLight },
}

export function DealDrawer({ deal, onClose, onUpdate }: DealDrawerProps) {
  const [loading, setLoading] = useState(false)
  const [activity, setActivity] = useState<{ type: ActivityType; notes: string }>({
    type: ActivityType.NOTE,
    notes: '',
  })

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
        // Update deal activities locally so timeline refreshes immediately
        onUpdate({
          ...deal,
          activities: [...(deal.activities || []), newActivity],
        })
        setActivity({ type: ActivityType.NOTE, notes: '' })
      }
    } catch {
      // silently fail — user can retry
    } finally {
      setLoading(false)
    }
  }

  const sortedActivities = [...(deal.activities || [])].sort(
    (a, b) => new Date(b.doneAt || b.createdAt).getTime() - new Date(a.doneAt || a.createdAt).getTime()
  )

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg h-[90vh] flex flex-col p-0 overflow-hidden rounded-xl">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl font-bold text-[#1E293B]">{deal.prospect.name}</DialogTitle>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge
                  variant="secondary"
                  className="text-[10px] bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]"
                >
                  {deal.serviceType.replace(/_/g, ' ')}
                </Badge>
                <Badge
                  className="text-[10px] border-0"
                  style={{
                    backgroundColor: deal.stage === 'GANADO' ? colors.successLight : deal.stage === 'PERDIDO' ? '#F3F4F6' : colors.primaryLight,
                    color: deal.stage === 'GANADO' ? colors.success : deal.stage === 'PERDIDO' ? '#6B7280' : colors.primary,
                  }}
                >
                  {deal.stage.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>
            {deal.value && (
              <div className="text-right">
                <p className="text-lg font-bold text-[#1A7A4A]">${deal.value.toLocaleString()}</p>
                <p className="text-[10px] text-[#94A3B8]">Valor del deal</p>
              </div>
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="timeline" className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-4">
            <TabsList className="w-full bg-[#F8FAFC] border border-[#E2E8F0]">
              <TabsTrigger value="timeline" className="flex-1 text-xs data-[state=active]:bg-white data-[state=active]:text-[#F26522]">
                <Activity className="w-3.5 h-3.5 mr-1.5" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="info" className="flex-1 text-xs data-[state=active]:bg-white data-[state=active]:text-[#F26522]">
                <UserCircle className="w-3.5 h-3.5 mr-1.5" />
                Info
              </TabsTrigger>
              <TabsTrigger value="notes" className="flex-1 text-xs data-[state=active]:bg-white data-[state=active]:text-[#F26522]">
                <FileText className="w-3.5 h-3.5 mr-1.5" />
                Notas
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 px-6 py-4">
            <TabsContent value="timeline" className="mt-0">
              <div className="space-y-4">
                {sortedActivities.length === 0 && (
                  <div className="text-center py-8">
                    <Activity className="mx-auto h-8 w-8 text-[#E2E8F0] mb-2" />
                    <p className="text-sm text-[#94A3B8]">Sin actividades registradas</p>
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
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-full"
                          style={{ backgroundColor: config.bg }}
                        >
                          <Icon className="h-4 w-4" style={{ color: config.color }} />
                        </div>
                        {i < sortedActivities.length - 1 && (
                          <div className="mt-1 h-full w-px bg-[#E2E8F0]" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-[#1E293B]">{act.type}</p>
                          {date && <p className="text-[10px] text-[#94A3B8]">{date}</p>}
                        </div>
                        {act.notes && (
                          <p className="text-sm text-[#64748B] mt-1">{act.notes}</p>
                        )}
                        {act.outcome && (
                          <Badge
                            variant="outline"
                            className="text-[10px] mt-1.5 border-[#E2E8F0] text-[#94A3B8]"
                          >
                            {act.outcome}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </TabsContent>

            <TabsContent value="info" className="mt-0">
              <div className="space-y-4">
                <div
                  className="rounded-lg border border-[#E2E8F0] bg-white p-4"
                  style={{ boxShadow: shadows.sm }}
                >
                  <h4 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">
                    Detalles del Deal
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-[#94A3B8] text-xs mb-0.5">Etapa</p>
                      <p className="font-medium text-[#1E293B]">{deal.stage.replace(/_/g, ' ')}</p>
                    </div>
                    <div>
                      <p className="text-[#94A3B8] text-xs mb-0.5">Valor</p>
                      <p className="font-medium text-[#1A7A4A]">${deal.value?.toLocaleString() || 0}</p>
                    </div>
                    <div>
                      <p className="text-[#94A3B8] text-xs mb-0.5">Responsable</p>
                      <p className="font-medium text-[#1E293B]">{deal.assignedUser?.name || deal.assignedTo || 'Sin asignar'}</p>
                    </div>
                    <div>
                      <p className="text-[#94A3B8] text-xs mb-0.5">Región</p>
                      <p className="font-medium text-[#1E293B]">{deal.region || '—'}</p>
                    </div>
                  </div>
                </div>

                {deal.contact && (
                  <div
                    className="rounded-lg border border-[#E2E8F0] bg-white p-4"
                    style={{ boxShadow: shadows.sm }}
                  >
                    <h4 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">
                      Contacto Principal
                    </h4>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F1F5F9] text-sm font-bold text-[#64748B]">
                        {deal.contact.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#1E293B]">{deal.contact.name}</p>
                        {deal.contact.email && (
                          <p className="text-xs text-[#64748B]">{deal.contact.email}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="notes" className="mt-0">
              <form onSubmit={logActivity} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="flex h-9 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/30"
                    value={activity.type}
                    onChange={(e) => setActivity({ ...activity, type: e.target.value as ActivityType })}
                  >
                    <option value={ActivityType.NOTE}>Nota</option>
                    <option value={ActivityType.EMAIL}>Email</option>
                    <option value={ActivityType.CALL}>Llamada</option>
                    <option value={ActivityType.LINKEDIN}>LinkedIn</option>
                    <option value={ActivityType.MEETING}>Reunión</option>
                  </select>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-[#F26522] hover:bg-[#D5551A] text-white"
                  >
                    {loading ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
                <Textarea
                  placeholder="Escribe los detalles de la actividad..."
                  value={activity.notes}
                  onChange={(e) => setActivity({ ...activity, notes: e.target.value })}
                  className="text-sm border-[#E2E8F0] focus-visible:ring-[#F26522]/30"
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
