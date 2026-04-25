'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Trash2, UserCheck } from 'lucide-react'
import { colors } from '@/lib/design-system'
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
        <Loader2 className="w-6 h-6 animate-spin text-[#94A3B8]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Crear nuevo */}
      <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
        <h3 className="text-sm font-semibold text-[#1E293B] mb-3">Agregar nuevo vendedor</h3>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Nombre"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 border-[#E2E8F0] focus-visible:ring-[#F26522]/30"
          />
          <Input
            placeholder="Email (opcional)"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="flex-1 border-[#E2E8F0] focus-visible:ring-[#F26522]/30"
          />
          <Button
            onClick={createMember}
            disabled={creating || !newName.trim()}
            className="bg-[#F26522] hover:bg-[#D5551A]"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Agregar
          </Button>
        </div>
      </div>

      {/* Lista */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <h3 className="text-sm font-semibold text-[#1E293B]">
            Vendedores ({members.length})
          </h3>
        </div>
        {members.length === 0 ? (
          <div className="p-8 text-center">
            <UserCheck className="w-8 h-8 mx-auto mb-2 text-[#E2E8F0]" />
            <p className="text-sm text-[#64748B]">No hay vendedores registrados</p>
            <p className="text-xs text-[#94A3B8] mt-1">Los vendedores se extraen automáticamente al importar datos</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F1F5F9]">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between px-4 py-3 hover:bg-[#F8FAFC] transition-colors">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{ backgroundColor: colors.primary }}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1E293B]">{member.name}</p>
                    {member.email && <p className="text-xs text-[#94A3B8]">{member.email}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-[#F1F5F9] text-[#64748B] border-0"
                  >
                    {member.role === 'SALES_REP' ? 'Vendedor' : member.role}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMember(member.id)}
                    className="text-[#DC2626] hover:text-[#B91C1C] hover:bg-[#FEF2F2] h-8 w-8 p-0"
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
