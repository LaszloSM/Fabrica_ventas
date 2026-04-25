'use client'
import { useState, useEffect } from 'react'
import { SequenceTracker } from '@/components/sequences/SequenceTracker'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { TemplateSequence } from '@/types'

export default function SequencesPage() {
  const [sequences, setSequences] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [templateSequences, setTemplateSequences] = useState<TemplateSequence[]>([])
  const [form, setForm] = useState({ prospectId: '', templateSequenceId: '', dealId: '' })

  async function fetchSequences() {
    const res = await fetch('/api/sequences')
    const json = await res.json()
    setSequences(json.data || [])
  }

  useEffect(() => {
    fetchSequences()
  }, [])

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/sequences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setOpen(false)
    fetchSequences()
  }

  return (
    <div className="p-7 max-w-4xl mx-auto">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <p className="text-[11px] font-semibold text-white/40 uppercase tracking-[0.08em] mb-1.5">Automatización</p>
          <h1 className="text-[32px] font-normal text-white leading-tight" style={{ fontFamily: 'var(--font-dm-serif), Georgia, serif' }}>Secuencias</h1>
          <p className="text-sm text-white/50 mt-1">Seguimiento automatizado de contactos</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-gradient-to-r from-[#f26522] to-[#d5551a] hover:from-[#d5551a] hover:to-[#b54514] text-white border-0">
          <Plus className="w-4 h-4 mr-2" /> Asignar Secuencia
        </Button>
      </div>

      <SequenceTracker sequences={sequences} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#1a1a2e]/95 border-white/10 backdrop-blur-xl">
          <DialogHeader><DialogTitle className="text-white">Asignar Secuencia a Prospecto</DialogTitle></DialogHeader>
          <form onSubmit={handleAssign} className="space-y-4">
            <div>
              <Label className="text-white/60">Prospecto ID *</Label>
              <Input required value={form.prospectId} onChange={e => setForm({...form, prospectId: e.target.value})} placeholder="ID del prospecto" className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-[#f26522]/50" />
            </div>
            <div>
              <Label className="text-white/60">Secuencia de Plantilla *</Label>
              <Input required value={form.templateSequenceId} onChange={e => setForm({...form, templateSequenceId: e.target.value})} placeholder="ID de la secuencia" className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-[#f26522]/50" />
            </div>
            <div>
              <Label className="text-white/60">Deal ID (Opcional)</Label>
              <Input value={form.dealId} onChange={e => setForm({...form, dealId: e.target.value})} placeholder="ID del deal" className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-[#f26522]/50" />
            </div>
            <Button type="submit" className="w-full bg-gradient-to-r from-[#f26522] to-[#d5551a] hover:from-[#d5551a] hover:to-[#b54514] text-white border-0">Asignar Secuencia</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
