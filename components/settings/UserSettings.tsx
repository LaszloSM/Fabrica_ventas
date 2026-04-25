'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Shield, User, RefreshCw } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface SystemUser {
  id: string
  email: string
  name?: string
  role: string
  createdAt: string
}

export function UserSettings() {
  const { toast } = useToast()
  const [users, setUsers] = useState<SystemUser[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  async function loadUsers() {
    setLoading(true)
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const json = await res.json()
        setUsers(json.data || [])
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  async function syncToTeam() {
    setSyncing(true)
    try {
      const res = await fetch('/api/users/sync-team', { method: 'POST' })
      if (res.ok) {
        const json = await res.json()
        toast(`Sincronización: ${json.data.created} creados, ${json.data.skipped} omitidos`, 'success')
        loadUsers()
      } else {
        toast('Error al sincronizar', 'error')
      }
    } catch {
      toast('Error al sincronizar', 'error')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    loadUsers()
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
      <div className="rounded-xl border border-blue-400/20 bg-blue-400/10 backdrop-blur-sm p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-white">Acceso restringido</p>
            <p className="text-sm text-white/50 mt-1">
              Solo los usuarios con correo @coimpactob.org pueden acceder al CRM.
              Los usuarios se registran automáticamente al iniciar sesión con Google.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">
          Usuarios del sistema ({users.length})
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={syncToTeam}
          disabled={syncing}
          className="gap-2 text-white/60 border-white/10 bg-white/5 hover:bg-white/10 hover:text-white"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          Sincronizar con equipo
        </Button>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
        {users.length === 0 ? (
          <div className="p-8 text-center">
            <User className="w-8 h-8 mx-auto mb-2 text-white/10" />
            <p className="text-sm text-white/40">No hay usuarios registrados aún</p>
            <p className="text-xs text-white/30 mt-1">Los usuarios aparecerán cuando inicien sesión</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/10 to-white/5 text-white/60 flex items-center justify-center text-sm font-bold">
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{user.name || user.email}</p>
                    <p className="text-xs text-white/40">{user.email}</p>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="text-[10px] bg-white/10 text-white/50 border-0"
                >
                  {user.role === 'ADMIN' ? 'Administrador' : 'Vendedor'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
