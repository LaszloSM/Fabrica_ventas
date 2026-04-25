'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Mail, Phone, Linkedin, Building2, MapPin, Calendar, FileText, CheckCircle } from 'lucide-react'
import type { Contact, Prospect, Deal, Activity } from '@/types'

interface ContactWithRelations extends Contact {
  prospect: Prospect
  deals: Deal[]
  activities: Activity[]
}

export default function ContactDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  
  const [contact, setContact] = useState<ContactWithRelations | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    fetch(`/api/contacts/${id}`)
      .then((r) => r.json())
      .then((j) => {
        setContact(j.data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <p className="text-gray-500">Contacto no encontrado</p>
      </div>
    )
  }

  const sortedActivities = [...(contact.activities || [])].sort(
    (a, b) => new Date(b.doneAt || b.createdAt).getTime() - new Date(a.doneAt || a.createdAt).getTime()
  )

  const sortedDeals = [...(contact.deals || [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver
      </Button>

      {/* Info principal */}
      <div className="bg-white border rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-2xl font-bold">
              {contact.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{contact.name}</h1>
              {contact.role && <p className="text-gray-500">{contact.role}</p>}
              <div className="flex items-center gap-2 mt-2">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">{contact.prospect?.name}</span>
                {contact.prospect?.industry && (
                  <Badge variant="secondary" className="text-xs">{contact.prospect.industry}</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {contact.email && (
              <Button variant="outline" size="sm" asChild>
                <a href={`mailto:${contact.email}`}>
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </a>
              </Button>
            )}
            {contact.phone && (
              <Button variant="outline" size="sm" asChild>
                <a href={`tel:${contact.phone}`}>
                  <Phone className="w-4 h-4 mr-2" />
                  Llamar
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Detalles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
          {contact.email && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Email</p>
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-sm">{contact.email}</span>
              </div>
            </div>
          )}
          {contact.phone && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Teléfono</p>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-sm">{contact.phone}</span>
              </div>
            </div>
          )}
          {contact.linkedinUrl && (
            <div>
              <p className="text-xs text-gray-500 mb-1">LinkedIn</p>
              <div className="flex items-center gap-1.5">
                <Linkedin className="w-3.5 h-3.5 text-gray-400" />
                <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                  Ver perfil
                </a>
              </div>
            </div>
          )}
          {contact.prospect?.region && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Ubicación</p>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-sm">{contact.prospect.region}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Timeline ({sortedActivities.length})
          </TabsTrigger>
          <TabsTrigger value="deals" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Deals ({sortedDeals.length})
          </TabsTrigger>
          <TabsTrigger value="info" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Organización
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <div className="bg-white border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Historial de interacciones</h2>
            {sortedActivities.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No hay actividades registradas</p>
            ) : (
              <div className="space-y-4">
                {sortedActivities.map((activity) => (
                  <div key={activity.id} className="flex gap-4 pb-4 border-b last:border-0">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{activity.type}</p>
                        <span className="text-xs text-gray-400">
                          {activity.doneAt ? new Date(activity.doneAt).toLocaleDateString('es-CO') : new Date(activity.createdAt).toLocaleDateString('es-CO')}
                        </span>
                      </div>
                      {activity.notes && (
                        <p className="text-sm text-gray-600 mt-1">{activity.notes}</p>
                      )}
                      <Badge variant="outline" className="text-xs mt-2">
                        {activity.outcome || 'COMPLETED'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="deals">
          <div className="bg-white border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Deals asociados</h2>
            {sortedDeals.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No hay deals asociados</p>
            ) : (
              <div className="space-y-3">
                {sortedDeals.map((deal) => (
                  <div
                    key={deal.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/pipeline?deal=${deal.id}`)}
                  >
                    <div>
                      <p className="font-medium">{deal.serviceType}</p>
                      <p className="text-sm text-gray-500">Etapa: {deal.stage}</p>
                    </div>
                    <div className="text-right">
                      {deal.value && (
                        <p className="font-semibold text-green-700">
                          ${(deal.value / 1_000_000).toFixed(1)}M
                        </p>
                      )}
                      <Badge className="text-xs mt-1">{deal.probability}% prob.</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="info">
          <div className="bg-white border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">{contact.prospect?.name}</h2>
            <div className="grid grid-cols-2 gap-4">
              {contact.prospect?.industry && (
                <div>
                  <p className="text-xs text-gray-500">Industria</p>
                  <p className="text-sm font-medium">{contact.prospect.industry}</p>
                </div>
              )}
              {contact.prospect?.segment && (
                <div>
                  <p className="text-xs text-gray-500">Segmento</p>
                  <p className="text-sm font-medium">{contact.prospect.segment}</p>
                </div>
              )}
              {contact.prospect?.region && (
                <div>
                  <p className="text-xs text-gray-500">Región</p>
                  <p className="text-sm font-medium">{contact.prospect.region}</p>
                </div>
              )}
              {contact.prospect?.size && (
                <div>
                  <p className="text-xs text-gray-500">Tamaño</p>
                  <p className="text-sm font-medium">{contact.prospect.size}</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
