'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Mail, Phone, Send, Volume2 } from 'lucide-react'
import type { Template } from '@/types'

interface TemplateCardProps {
  template: Template
  onPreview: (t: Template) => void
}

const ICON_MAP: Record<string, React.ReactNode> = {
  EMAIL_COLD: <Mail className="w-4 h-4" />,
  EMAIL_FOLLOWUP: <Mail className="w-4 h-4" />,
  LINKEDIN_MESSAGE: <Send className="w-4 h-4" />,
  LINKEDIN_TRIGGER: <Send className="w-4 h-4" />,
  CALL_SCRIPT: <Phone className="w-4 h-4" />,
  VOICEMAIL: <Volume2 className="w-4 h-4" />,
}

export function TemplateCard({ template, onPreview }: TemplateCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-500">
            {ICON_MAP[template.type] || <Mail className="w-4 h-4" />}
            <span className="text-xs font-medium uppercase">{template.type.replace('_', ' ')}</span>
          </div>
          {template.segment && <Badge variant="secondary" className="text-[10px]">{template.segment}</Badge>}
        </div>
        <CardTitle className="text-base mt-2">{template.name}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-sm text-gray-600 line-clamp-3 italic mb-4">
          {template.body}
        </p>
        <Button onClick={() => onPreview(template)} variant="outline" className="w-full text-xs">
          Previsualizar
        </Button>
      </CardContent>
    </Card>
  )
}
