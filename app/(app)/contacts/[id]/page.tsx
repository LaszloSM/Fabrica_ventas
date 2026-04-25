'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Mail, Phone, ExternalLink, Building2, MapPin, Calendar, FileText, CheckCircle } from 'lucide-react'
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f26522]" />
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4 text-white/70 hover:text-white hover:bg-white/5">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <p className="text-white/40">Contacto no encontrado</p>
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
      <Button variant="ghost" onClick={() => router.back()} className="mb-4 text-white/70 hover:text-white hover:bg-white/5">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver
      </Button>

      {/* Info principal */}
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#f26522] to-[#d5551a] text-white flex items-center justify-center text-2xl font-bold shadow-lg shadow-orange-500/30">
              {contact.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{contact.name}</h1>
              {contact.role && <p className="text-white/50">{contact.role}</p>}
              <div className="flex items-center gap-2 mt-2">
                <Building2 className="w-4 h-4 text-white/30" />
                <span className="text-sm text-white/60">{contact.prospect?.name}</span>
                {contact.prospect?.industry && (
                  <Badge variant="secondary" className="text-xs bg-white/10 text-white/50 border-0">{contact.prospect.industry}</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-[0.8rem] font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Mail className="w-4 h-4" />
                Email
              </a>
            )}
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-[0.8rem] font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Phone className="w-4 h-4" />
                Llamar
              </a>
            )}
          </div>
        </div>

        {/* Detalles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
          {contact.email && (
            <div>
              <p className="text-xs text-white/40 mb-1">Email</p>
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-white/30" />
                <span className="text-sm text-white/70">{contact.email}</span>
              </div>
            </div>
          )}
          {contact.phone && (
            <div>
              <p className="text-xs text-white/40 mb-1">Teléfono</p>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-white/30" />
                <span className="text-sm text-white/70">{contact.phone}</span>
              </div>
            </div>
          )}
          {contact.linkedinUrl && (
            <div>
              <p className="text-xs text-white/40 mb-1">LinkedIn</p>
              <div className="flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-white/30" />
                <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-[#f26522] hover:underline">
                  Ver perfil
                </a>
              </div>
            </div>
          )}
          {contact.prospect?.region && (
            <div>
              <p className="text-xs text-white/40 mb-1">Ubicación</p>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-white/30" />
                <span className="text-sm text-white/70">{contact.prospect.region}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="timeline" className="flex items-center gap-2 text-white/50 data-[state=active]:bg-white/10 data-[state=active]:text-[#f26522]">
            <Calendar className="w-4 h-4" />
            Timeline ({sortedActivities.length})
          </TabsTrigger>
          <TabsTrigger value="deals" className="flex items-center gap-2 text-white/50 data-[state=active]:bg-white/10 data-[state=active]:text-[#f26522]">
            <FileText className="w-4 h-4" />
            Deals ({sortedDeals.length})
          </TabsTrigger>
          <TabsTrigger value="info" className="flex items-center gap-2 text-white/50 data-[state=active]:bg-white/10 data-[state=active]:text-[#f26522]">
            <Building2 className="w-4 h-4" />
            Organización
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Historial de interacciones</h2>
            {sortedActivities.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="mx-auto h-8 w-8 text-white/10 mb-2" />
                <p className="text-white/40">No hay actividades registradas</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedActivities.map((activity) => (
                  <div key={activity.id} className="flex gap-4 pb-4 border-b border-white/10 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-[#f26522]/20 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-[#f26522]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm text-white">{activity.type}</p>
                        <span className="text-xs text-white/30">
                          {activity.doneAt ? new Date(activity.doneAt).toLocaleDateString('es-CO') : new Date(activity.createdAt).toLocaleDateString('es-CO')}
                        </span>
                      </div>
                      {activity.notes && (
                        <p className="text-sm text-white/50 mt-1">{activity.notes}</p>
                      )}
                      <Badge variant="outline" className="text-xs mt-2 border-white/10 text-white/40">
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
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Deals asociados</h2>
            {sortedDeals.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-8 w-8 text-white/10 mb-2" />
                <p className="text-white/40">No hay deals asociados</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedDeals.map((deal) => (
                  <div
                    key={deal.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/[0.07] cursor-pointer transition-all"
                    onClick={() => router.push(`/pipeline?deal=${deal.id}`)}
                  >
                    <div>
                      <p className="font-medium text-white">{deal.serviceType}</p>
                      <p className="text-sm text-white/50">Etapa: {deal.stage}</p>
                    </div>
                    <div className="text-right">
                      {deal.value && (
                        <p className="font-semibold text-emerald-400">
                          ${(deal.value / 1_000_000).toFixed(1)}M
                        </p>
                      )}
                      <Badge className="text-xs mt-1 bg-white/10 text-white/50 border-0">{stageProbability(deal.stage)}% prob.</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="info">
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
            <h2 className="text-lg font-semibold text-white mb-4">{contact.prospect?.name}</h2>
            <div className="grid grid-cols-2 gap-4">
              {contact.prospect?.industry && (
                <div>
                  <p className="text-xs text-white/40">Industria</p>
                  <p className="text-sm font-medium text-white">{contact.prospect.industry}</p>
                </div>
              )}
              {contact.prospect?.segment && (
                <div>
                  <p className="text-xs text-white/40">Segmento</p>
                  <p className="text-sm font-medium text-white">{contact.prospect.segment}</p>
                </div>
              )}
              {contact.prospect?.region && (
                <div>
                  <p className="text-xs text-white/40">Región</p>
                  <p className="text-sm font-medium text-white">{contact.prospect.region}</p>
                </div>
              )}
              {contact.prospect?.size && (
                <div>
                  <p className="text-xs text-white/40">Tamaño</p>
                  <p className="text-sm font-medium text-white">{contact.prospect.size}</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function stageProbability(stage: string): number {
  switch (stage) {
    case 'PROSPECTO_IDENTIFICADO': return 10
    case 'SENAL_DETECTADA': return 20
    case 'PRIMER_CONTACTO': return 30
    case 'EN_SECUENCIA': return 40
    case 'REUNION_AGENDADA': return 50
    case 'PROPUESTA_ENVIADA': return 60
    case 'NEGOCIACION': return 80
    case 'GANADO': return 100
    case 'PERDIDO': return 0
    default: return 0
  }
}
