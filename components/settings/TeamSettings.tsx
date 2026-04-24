'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Trash2, UserCheck } from 'lucide-react'

interface TeamMember {
  id: string
  name: string
  email?: string
  role: string
  isActive: boolean
}

export function TeamSettings() {
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
      }
    } catch {
      alert('Error al crear miembro')
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
      } else {
        const json = await res.json()
        alert(json.detail || 'No se puede eliminar: tiene deals asignados')
      }
    } catch {
      alert('Error al eliminar')
    }
  }

  useEffect(() => {
    loadMembers()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Crear nuevo */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Agregar nuevo vendedor</h3>
        <div className="flex gap-3">
          <Input
            placeholder="Nombre"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="Email (opcional)"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="flex-1"
          />
          <Button onClick={createMember} disabled={creating || !newName.trim()}>
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Agregar
          </Button>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">
            Vendedores ({members.length})
          </h3>
        </div>
        {members.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <UserCheck className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>No hay vendedores registrados</p>
            <p className="text-sm">Los vendedores se extraen automáticamente al importar datos</p>
          </div>
        ) : (
          <div className="divide-y">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-medium">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{member.name}</p>
                    {member.email && <p className="text-xs text-gray-500">{member.email}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={member.role === 'ADMIN' ? 'default' : 'secondary'} className="text-xs">
                    {member.role === 'SALES_REP' ? 'Vendedor' : member.role}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMember(member.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
