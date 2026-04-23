'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const REGIONS = ['Antioquia', 'Cundinamarca', 'La Guajira', 'Otros', 'Nacional']

interface ProspectFormProps {
  onSuccess?: () => void
}

export function ProspectForm({ onSuccess }: ProspectFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', industry: '', region: '', segment: '', website: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setLoading(false)
    router.refresh()
    onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Empresa *</Label>
        <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="industry">Sector</Label>
          <Input id="industry" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
        </div>
        <div>
          <Label>Región</Label>
          <Select value={form.region} onValueChange={(v) => setForm({ ...form, region: v })}>
            <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
            <SelectContent>
              {REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="website">Sitio web</Label>
        <Input id="website" type="url" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700">
        {loading ? 'Guardando...' : 'Crear prospecto'}
      </Button>
    </form>
  )
}
