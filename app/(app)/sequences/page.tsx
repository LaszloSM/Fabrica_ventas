'use client'
import { useState, useEffect } from 'react'
import { SequenceTracker } from '@/components/sequences/SequenceTracker'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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

  async function fetchTemplateSequences() {
    // In a real app, we'd have an API for this. For now, let's assume we can fetch them.
    // I'll implement a quick API for this if needed, but let's see.
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
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Secuencias de Prospección</h1>
          <p className="text-gray-500 mt-1">Seguimiento automatizado de contactos</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" /> Asignar Secuencia
        </Button>
      </div>

      <SequenceTracker sequences={sequences} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Asignar Secuencia a Prospecto</DialogTitle></DialogHeader>
          <form onSubmit={handleAssign} className="space-y-4">
            <div>
              <Label>Prospecto ID *</Label>
              <Input required value={form.prospectId} onChange={e => setForm({...form, prospectId: e.target.value})} placeholder="ID del prospecto" />
            </div>
            <div>
              <Label>Secuencia de Plantilla *</Label>
              <Input required value={form.templateSequenceId} onChange={e => setForm({...form, templateSequenceId: e.target.value})} placeholder="ID de la secuencia" />
            </div>
            <div>
              <Label>Deal ID (Opcional)</Label>
              <Input value={form.dealId} onChange={e => setForm({...form, dealId: e.target.value})} placeholder="ID del deal" />
            </div>
            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">Asignar Secuencia</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
