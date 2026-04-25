'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { AlertTriangle, CheckCircle, Database, Loader2, Trash2 } from 'lucide-react'

interface ImportStats {
  prospects: number
  contacts: number
  deals: number
  activities: number
  team_members: number
  duplicates_skipped: number
  rows_processed: number
}

interface DbStatus {
  prospects: number
  contacts: number
  deals: number
  activities: number
  team_members: number
  archived_deals: number
}

interface ImportModalProps {
  open: boolean
  onClose: () => void
  onDone: () => void
}

export function ImportModal({ open, onClose, onDone }: ImportModalProps) {
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<ImportStats | null>(null)
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [force, setForce] = useState(false)

  async function checkStatus() {
    setChecking(true)
    try {
      const res = await fetch('/api/import/status')
      if (res.ok) {
        const json = await res.json()
        setDbStatus(json.data)
      }
    } catch {
      // silently fail
    } finally {
      setChecking(false)
    }
  }

  async function handleImport() {
    setLoading(true)
    setError(null)
    try {
      const url = force ? '/api/import/comprehensive?force=true' : '/api/import/comprehensive'
      const res = await fetch(url, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setError(json.detail || json.message || 'Error al importar')
      } else {
        setResult(json.data)
        onDone()
        checkStatus()
      }
    } catch {
      setError('No se pudo conectar al servidor')
    } finally {
      setLoading(false)
    }
  }

  async function handleClear() {
    if (!confirm('¿Eliminar TODOS los datos? Esta acción no se puede deshacer.')) return
    setLoading(true)
    try {
      const res = await fetch('/api/import', { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json()
        setError(json.detail || 'Error al limpiar datos')
      } else {
        setResult(null)
        checkStatus()
      }
    } catch {
      setError('No se pudo conectar al servidor')
    } finally {
      setLoading(false)
    }
  }

  const hasData = dbStatus && (dbStatus.prospects > 0 || dbStatus.contacts > 0)

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" />
            Importar Base de Datos
          </DialogTitle>
          <p className="text-sm text-gray-500 mt-1">
            Importa los ~1,400 contactos desde los archivos CSV de CoimpactoB.
          </p>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-green-800 font-semibold">Importación completada</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white rounded p-2">
                  <p className="text-gray-500">Filas procesadas</p>
                  <p className="text-xl font-bold text-gray-900">{result.rows_processed}</p>
                </div>
                <div className="bg-white rounded p-2">
                  <p className="text-gray-500">Vendedores</p>
                  <p className="text-xl font-bold text-gray-900">{result.team_members}</p>
                </div>
                <div className="bg-white rounded p-2">
                  <p className="text-gray-500">Prospectos</p>
                  <p className="text-xl font-bold text-gray-900">{result.prospects}</p>
                </div>
                <div className="bg-white rounded p-2">
                  <p className="text-gray-500">Contactos</p>
                  <p className="text-xl font-bold text-gray-900">{result.contacts}</p>
                </div>
                <div className="bg-white rounded p-2">
                  <p className="text-gray-500">Deals</p>
                  <p className="text-xl font-bold text-gray-900">{result.deals}</p>
                </div>
                <div className="bg-white rounded p-2">
                  <p className="text-gray-500">Actividades</p>
                  <p className="text-xl font-bold text-gray-900">{result.activities}</p>
                </div>
              </div>
              {result.duplicates_skipped > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  {result.duplicates_skipped} contactos duplicados omitidos
                </p>
              )}
            </div>
            <Button onClick={onClose} className="w-full">Cerrar</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Estado actual de la BD */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">Estado de la base de datos</p>
                <Button variant="ghost" size="sm" onClick={checkStatus} disabled={checking}>
                  {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Actualizar'}
                </Button>
              </div>
              {dbStatus ? (
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="bg-white rounded px-2 py-1">
                    <p className="text-gray-500">Prospects</p>
                    <p className="font-bold">{dbStatus.prospects}</p>
                  </div>
                  <div className="bg-white rounded px-2 py-1">
                    <p className="text-gray-500">Contacts</p>
                    <p className="font-bold">{dbStatus.contacts}</p>
                  </div>
                  <div className="bg-white rounded px-2 py-1">
                    <p className="text-gray-500">Deals</p>
                    <p className="font-bold">{dbStatus.deals}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Haz clic en Actualizar para ver el estado</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {hasData && (
              <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <input
                  type="checkbox"
                  id="force"
                  checked={force}
                  onChange={(e) => setForce(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="force" className="text-sm text-yellow-800">
                  Forzar reimportación (eliminar datos existentes primero)
                </label>
              </div>
            )}

            <Button
              onClick={handleImport}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Importando...
                </>
              ) : (
                'Importar todos los CSVs'
              )}
            </Button>

            {hasData && (
              <Button
                variant="outline"
                onClick={handleClear}
                disabled={loading}
                className="w-full text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Limpiar todos los datos
              </Button>
            )}

            <p className="text-xs text-gray-500">
              Se importarán datos de 6 fuentes: 2026, Banca frío, Banca caliente, CAF, Contactos Airtable y Base 2025.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
