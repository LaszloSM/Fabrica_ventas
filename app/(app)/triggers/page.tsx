'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Zap, ExternalLink, Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { TriggerType } from '@/types'

export default function TriggersPage() {
  const [triggers, setTriggers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<{ prospectId: string; triggerType: TriggerType; description: string }>({
    prospectId: '',
    triggerType: TriggerType.EXPANSION,
    description: '',
  })

  useEffect(() => {
    fetch('/api/triggers').then((r) => r.json()).then((j) => {
      setTriggers(j.data || [])
      setLoading(false)
    })
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/triggers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setOpen(false)
    const res = await fetch('/api/triggers')
    const json = await res.json()
    setTriggers(json.data || [])
  }

  if (loading) return <div className="p-6 text-center text-gray-400">Cargando señales...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Señales de Venta</h1>
          <p className="text-gray-500 mt-1">Prospectos calientes con triggers detectados</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" /> Detectar Señal
        </Button>
      </div>

      <div className="grid gap-4">
        {triggers.length === 0 ? (
          <div className="bg-gray-50 border border-dashed rounded-xl p-12 text-center text-gray-400">
            <Zap className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No hay señales activas. ¡Es momento de investigar!</p>
          </div>
        ) : (
          triggers.map((t) => (
            <Card key={t.id} className="p-4 flex items-center justify-between hover:border-green-200 transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{t.prospect.name}</p>
                    <Badge variant="secondary" className="text-[10px]">{t.triggerType.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-sm text-gray-600">{t.description || 'Sin descripción adicional'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => window.open(`/prospects/${t.prospectId}`, '_blank')}>
                  <ExternalLink className="w-3 h-3 mr-1" /> Ver Prospecto
                </Button>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs">
                  Iniciar Secuencia
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Señal de Venta</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label>Prospecto ID *</Label>
              <Input required value={form.prospectId} onChange={e => setForm({...form, prospectId: e.target.value})} />
            </div>
            <div>
              <Label>Tipo de Señal</Label>
              <Select value={form.triggerType} onValueChange={(v) => setForm({...form, triggerType: v as TriggerType})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(TriggerType).map(type => <SelectItem key={type} value={type}>{type.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea 
                className="text-sm" 
                value={form.description} 
                onChange={(e) => setForm({...form, description: e.target.value})} 
              />
            </div>
            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">Guardar Señal</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
