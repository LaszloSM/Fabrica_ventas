'use client'
import { useState, useEffect } from 'react'
import { TemplateCard } from '@/components/templates/TemplateCard'
import { VariablePreview } from '@/components/templates/VariablePreview'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Template, TemplateType } from '@/types'

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/templates').then((r) => r.json()).then((j) => {
      setTemplates(j.data || [])
      setLoading(false)
    })
  }, [])

  const filterByType = (type: TemplateType) => {
    return templates.filter((t) => t.type === type)
  }

  if (loading) return <div className="p-6 text-center text-gray-400">Cargando plantillas...</div>

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Librería de Plantillas</h1>
        <p className="text-gray-500 mt-1">Mensajes validados del Manual de Jugadas Maestras</p>
      </div>

      <Tabs defaultValue="EMAIL_COLD" className="space-y-6">
        <TabsList className="bg-gray-100 p-1">
          <TabsTrigger value="EMAIL_COLD">Email Frío</TabsTrigger>
          <TabsTrigger value="EMAIL_FOLLOWUP">Seguimiento</TabsTrigger>
          <TabsTrigger value="LINKEDIN">LinkedIn</TabsTrigger>
          <TabsTrigger value="CALL">Llamada / Voz</TabsTrigger>
        </TabsList>

        <TabsContent value="EMAIL_COLD" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filterByType('EMAIL_COLD').map((t) => (
            <TemplateCard key={t.id} template={t} onPreview={setSelectedTemplate} />
          ))}
        </TabsContent>

        <TabsContent value="EMAIL_FOLLOWUP" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filterByType('EMAIL_FOLLOWUP').map((t) => (
            <TemplateCard key={t.id} template={t} onPreview={setSelectedTemplate} />
          ))}
        </TabsContent>

        <TabsContent value="LINKEDIN" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.filter(t => t.type.startsWith('LINKEDIN')).map((t) => (
            <TemplateCard key={t.id} template={t} onPreview={setSelectedTemplate} />
          ))}
        </TabsContent>

        <TabsContent value="CALL" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.filter(t => t.type === 'CALL_SCRIPT' || t.type === 'VOICEMAIL').map((t) => (
            <TemplateCard key={t.id} template={t} onPreview={setSelectedTemplate} />
          ))}
        </TabsContent>
      </Tabs>

      {selectedTemplate && (
        <VariablePreview 
          template={selectedTemplate} 
          open={!!selectedTemplate} 
          onClose={() => setSelectedTemplate(null)} 
        />
      )}
    </div>
  )
}
