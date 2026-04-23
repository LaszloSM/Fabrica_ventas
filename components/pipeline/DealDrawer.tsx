'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Activity, Plus, X } from 'lucide-react'
import type { DealWithRelations } from '@/types'
import { ActivityType } from '@/types'

interface DealDrawerProps {
  deal: DealWithRelations
  onClose: () => void
  onUpdate: (updated: DealWithRelations) => void
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
    const res = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealId: deal.id, ...activity }),
    })
    if (res.ok) {
      const json = await res.json()
      // Ideally, we'd refetch the deal to update the timeline
      // For now, we just clear the form and close
      setActivity({ type: ActivityType.NOTE, notes: '' })
    }
    setLoading(false)
    onClose()
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">{deal.prospect.name}</DialogTitle>
            <Badge variant="outline" className="capitalize">{deal.serviceType}</Badge>
          </div>
        </DialogHeader>
        
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-8">
            <section>
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Detalles del Deal</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Etapa</p>
                  <p className="font-medium">{deal.stage}</p>
                </div>
                <div>
                  <p className="text-gray-400">Valor</p>
                  <p className="font-medium">${deal.value?.toLocaleString() || 0}</p>
                </div>
              </div>
            </section>

            <Separator />

            <section>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Línea de Tiempo</h4>
                <span className="text-xs text-gray-400">{deal.activities.length} actividades</span>
              </div>
              <div className="space-y-4">
                {deal.activities.length === 0 && (
                  <p className="text-sm text-gray-400 italic text-center py-4">Sin actividades registradas</p>
                )}
                {deal.activities.map((act, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <div className="mt-1">
                      <Activity className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <p className="font-medium">{act.type}</p>
                        <p className="text-xs text-gray-400">{new Date(act.doneAt).toLocaleDateString()}</p>
                      </div>
                      <p className="text-gray-600 mt-1">{act.notes}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </ScrollArea>

        <div className="p-6 border-t bg-gray-50">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Registrar Actividad</h4>
          <form onSubmit={logActivity} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={activity.type}
                onChange={(e) => setActivity({ ...activity, type: e.target.value as ActivityType })}
              >
                <option value={ActivityType.NOTE}>Nota</option>
                <option value={ActivityType.EMAIL}>Email</option>
                <option value={ActivityType.CALL}>Llamada</option>
                <option value={ActivityType.LINKEDIN}>LinkedIn</option>
                <option value={ActivityType.MEETING}>Reunión</option>
              </select>
              <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
                {loading ? '...' : 'Guardar'}
              </Button>
            </div>
            <Textarea
              placeholder="Escribe los detalles de la actividad..."
              value={activity.notes}
              onChange={(e) => setActivity({ ...activity, notes: e.target.value })}
              className="text-sm"
              rows={3}
            />
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
