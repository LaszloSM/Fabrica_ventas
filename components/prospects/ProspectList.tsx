'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Search, Plus, MapPin, Building2 } from 'lucide-react'

interface ProspectListProps {
  onCreateNew: () => void
}

export function ProspectList({ onCreateNew }: ProspectListProps) {
  const [prospects, setProspects] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/prospects?search=${encodeURIComponent(search)}`)
      const json = await res.json()
      setProspects(json.data?.prospects || [])
      setLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar prospectos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={onCreateNew} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" /> Nuevo prospecto
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : (
        <div className="grid gap-3">
          {prospects.map((p) => (
            <Link key={p.id} href={`/prospects/${p.id}`}>
              <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{p.name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      {p.industry && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{p.industry}</span>}
                      {p.region && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.region}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {p.deals?.length > 0 && (
                      <Badge variant="secondary">{p.deals.length} deal{p.deals.length > 1 ? 's' : ''}</Badge>
                    )}
                    {p.triggers?.length > 0 && (
                      <Badge className="bg-amber-100 text-amber-800">⚡ {p.triggers.length} señal{p.triggers.length > 1 ? 'es' : ''}</Badge>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
          {prospects.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              No hay prospectos. ¡Crea el primero!
            </div>
          )}
        </div>
      )}
    </div>
  )
}
