'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Shield, User } from 'lucide-react'

interface SystemUser {
  id: string
  email: string
  name?: string
  role: string
  createdAt: string
}

export function UserSettings() {
  const [users, setUsers] = useState<SystemUser[]>([])
  const [loading, setLoading] = useState(true)

  async function loadUsers() {
    setLoading(true)
    try {
      // Nota: necesitamos crear este endpoint en el backend
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

  useEffect(() => {
    loadUsers()
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
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900">Acceso restringido</p>
            <p className="text-sm text-blue-700 mt-1">
              Solo los usuarios con correo @coimpactob.org pueden acceder al CRM.
              Los usuarios se registran automáticamente al iniciar sesión con Google.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">
            Usuarios registrados ({users.length})
          </h3>
        </div>
        {users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <User className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>No hay usuarios registrados aún</p>
            <p className="text-sm">Los usuarios aparecerán cuando inicien sesión</p>
          </div>
        ) : (
          <div className="divide-y">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-sm font-medium">
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{user.name || user.email}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
                <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'} className="text-xs">
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
