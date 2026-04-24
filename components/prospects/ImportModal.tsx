'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'

interface ImportResult {
  prospects: number
  contacts: number
  deals: number
  activities: number
  totalRows: number
}

interface ImportModalProps {
  open: boolean
  onClose: () => void
  onDone: () => void
}

export function ImportModal({ open, onClose, onDone }: ImportModalProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleImport() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/import', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setError(json.detail || 'Error al importar')
      } else {
        setResult(json.data)
        onDone()
      }
    } catch {
      setError('No se pudo conectar al servidor')
    } finally {
      setLoading(false)
    }
  }

  async function handleClear() {
    if (!confirm('¿Eliminar todos los datos importados? Esta acción no se puede deshacer.')) return
    setLoading(true)
    const res = await fetch('/api/import', { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json()
      setError(json.detail || 'Error al limpiar datos')
    } else {
      setResult(null)
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar desde Google Sheets</DialogTitle>
          <DialogDescription>
            Importa los contactos del sheet de CoimpactoB. Solo funciona si la BD está vacía.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-2 text-sm">
            <p className="text-green-600 font-medium">Importación completada</p>
            <ul className="space-y-1 text-gray-600">
              <li>Filas procesadas: <strong>{result.totalRows}</strong></li>
              <li>Prospectos creados: <strong>{result.prospects}</strong></li>
              <li>Contactos creados: <strong>{result.contacts}</strong></li>
              <li>Deals creados: <strong>{result.deals}</strong></li>
              <li>Actividades creadas: <strong>{result.activities}</strong></li>
            </ul>
            <Button onClick={onClose} className="w-full mt-4">Cerrar</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {error && (
              <p className="text-red-600 text-sm bg-red-50 p-3 rounded">{error}</p>
            )}
            <Button
              onClick={handleImport}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {loading ? 'Importando...' : 'Importar ahora'}
            </Button>
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={loading}
              className="w-full text-red-600 border-red-200"
            >
              Limpiar datos importados
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
