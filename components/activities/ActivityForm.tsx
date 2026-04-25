'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ActivityType } from '@/types'

interface ActivityFormProps {
  dealId?: string
  prospectId?: string
  onSuccess: () => void
}

export function ActivityForm({ dealId, prospectId, onSuccess }: ActivityFormProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<{ type: ActivityType; notes: string; outcome: string }>({
    type: ActivityType.NOTE,
    notes: '',
    outcome: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, dealId, prospectId }),
    })
    setLoading(false)
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label className="text-xs text-white/60">Tipo</Label>
        <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as ActivityType })}>
          <SelectTrigger className="h-8 text-xs border-white/10 bg-white/5 text-white">
            <SelectValue placeholder="Seleccionar..." />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a2e] border-white/10">
            <SelectItem value={ActivityType.NOTE}>Nota</SelectItem>
            <SelectItem value={ActivityType.EMAIL}>Email</SelectItem>
            <SelectItem value={ActivityType.CALL}>Llamada</SelectItem>
            <SelectItem value={ActivityType.LINKEDIN}>LinkedIn</SelectItem>
            <SelectItem value={ActivityType.MEETING}>Reunión</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-white/60">Notas</Label>
        <Textarea 
          className="text-xs border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-[#f26522]/50" 
          rows={3} 
          value={form.notes} 
          onChange={e => setForm({...form, notes: e.target.value})} 
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-[#f26522] to-[#d5551a] hover:from-[#d5551a] hover:to-[#b54514] text-white border-0 text-xs">
        {loading ? 'Guardando...' : 'Registrar Actividad'}
      </Button>
    </form>
  )
}
