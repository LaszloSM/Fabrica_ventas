'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Trash2, UserCheck } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface TeamMember {
  id: string
  name: string
  email?: string
  role: string
  isActive: boolean
}

export function TeamSettings() {
  const { toast } = useToast()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [creating, setCreating] = useState(false)

  async function loadMembers() {
    setLoading(true)
    try {
      const res = await fetch('/api/team')
      if (res.ok) {
        const json = await res.json()
        setMembers(json.data || [])
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  async function createMember() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, email: newEmail || null, role: 'SALES_REP' }),
      })
      if (res.ok) {
        setNewName('')
        setNewEmail('')
        loadMembers()
        toast('Vendedor agregado correctamente', 'success')
      } else {
        toast('Error al agregar vendedor', 'error')
      }
    } catch {
      toast('Error al agregar vendedor', 'error')
    } finally {
      setCreating(false)
    }
  }

  async function deleteMember(id: string) {
    if (!confirm('¿Eliminar este miembro del equipo?')) return
    try {
      const res = await fetch(`/api/team/${id}`, { method: 'DELETE' })
      if (res.ok) {
        loadMembers()
        toast('Vendedor eliminado', 'success')
      } else {
        const json = await res.json()
        toast(json.detail || 'No se puede eliminar: tiene deals asignados', 'error')
      }
    } catch {
      toast('Error al eliminar', 'error')
    }
  }

  useEffect(() => {
    loadMembers()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-white/40" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Crear nuevo */}
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Agregar nuevo vendedor</h3>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Nombre"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-[#f26522]/50"
          />
          <Input
            placeholder="Email (opcional)"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="flex-1 border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-[#f26522]/50"
          />
          <Button
            onClick={createMember}
            disabled={creating || !newName.trim()}
            className="bg-gradient-to-r from-[#f26522] to-[#d5551a] hover:from-[#d5551a] hover:to-[#b54514] text-white border-0"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Agregar
          </Button>
        </div>
      </div>

      {/* Lista */}
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 bg-white/5">
          <h3 className="text-sm font-semibold text-white">
            Vendedores ({members.length})
          </h3>
        </div>
        {members.length === 0 ? (
          <div className="p-8 text-center">
            <UserCheck className="w-8 h-8 mx-auto mb-2 text-white/10" />
            <p className="text-sm text-white/40">No hay vendedores registrados</p>
            <p className="text-xs text-white/30 mt-1">Los vendedores se extraen automáticamente al importar datos</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br from-[#f26522] to-[#d5551a]">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{member.name}</p>
                    {member.email && <p className="text-xs text-white/40">{member.email}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-white/10 text-white/50 border-0"
                  >
                    {member.role === 'SALES_REP' ? 'Vendedor' : member.role}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMember(member.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 w-8 p-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
