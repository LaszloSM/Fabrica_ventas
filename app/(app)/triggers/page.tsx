'use client'
import { useState, useEffect } from 'react'
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

  if (loading) return <div className="p-6 text-center text-white/40">Cargando señales...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Señales de Venta</h1>
          <p className="text-white/50 mt-1">Prospectos calientes con triggers detectados</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-gradient-to-r from-[#f26522] to-[#d5551a] hover:from-[#d5551a] hover:to-[#b54514] text-white border-0">
          <Plus className="w-4 h-4 mr-2" /> Detectar Señal
        </Button>
      </div>

      <div className="grid gap-4">
        {triggers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-12 text-center">
            <Zap className="w-12 h-12 mx-auto mb-4 text-white/10" />
            <p className="text-white/40">No hay señales activas. ¡Es momento de investigar!</p>
          </div>
        ) : (
          triggers.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 transition-all hover:border-white/20 hover:bg-white/[0.07]">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white">{t.prospect.name}</p>
                    <Badge variant="secondary" className="text-[10px] bg-white/10 text-white/50 border-0">{t.triggerType.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-sm text-white/50">{t.description || 'Sin descripción adicional'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white" onClick={() => window.open(`/prospects/${t.prospectId}`, '_blank')}>
                  <ExternalLink className="w-3 h-3 mr-1" /> Ver Prospecto
                </Button>
                <Button size="sm" className="bg-gradient-to-r from-[#f26522] to-[#d5551a] hover:from-[#d5551a] hover:to-[#b54514] text-white border-0 text-xs">
                  Iniciar Secuencia
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#1a1a2e]/95 border-white/10 backdrop-blur-xl">
          <DialogHeader><DialogTitle className="text-white">Registrar Señal de Venta</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label className="text-white/60">Prospecto ID *</Label>
              <Input required value={form.prospectId} onChange={e => setForm({...form, prospectId: e.target.value})} className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-[#f26522]/50" />
            </div>
            <div>
              <Label className="text-white/60">Tipo de Señal</Label>
              <Select value={form.triggerType} onValueChange={(v) => setForm({...form, triggerType: v as TriggerType})}>
                <SelectTrigger className="border-white/10 bg-white/5 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-white/10">
                  {Object.values(TriggerType).map(type => <SelectItem key={type} value={type}>{type.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white/60">Descripción</Label>
              <Textarea 
                className="text-sm border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-[#f26522]/50" 
                value={form.description} 
                onChange={(e) => setForm({...form, description: e.target.value})} 
              />
            </div>
            <Button type="submit" className="w-full bg-gradient-to-r from-[#f26522] to-[#d5551a] hover:from-[#d5551a] hover:to-[#b54514] text-white border-0">Guardar Señal</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
