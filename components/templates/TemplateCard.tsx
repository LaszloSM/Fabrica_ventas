'use client'
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
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 transition-all hover:border-white/20 hover:bg-white/[0.07] hover:-translate-y-0.5 group">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-white/40">
          {ICON_MAP[template.type] || <Mail className="w-4 h-4" />}
          <span className="text-xs font-medium uppercase">{template.type.replace('_', ' ')}</span>
        </div>
        {template.segment && <Badge variant="secondary" className="text-[10px] bg-white/10 text-white/50 border-0">{template.segment}</Badge>}
      </div>
      <h3 className="text-base font-semibold text-white mb-2 group-hover:text-[#f26522] transition-colors">{template.name}</h3>
      <p className="text-sm text-white/50 line-clamp-3 italic mb-4">
        {template.body}
      </p>
      <Button onClick={() => onPreview(template)} variant="outline" className="w-full text-xs border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white">
        Previsualizar
      </Button>
    </div>
  )
}
