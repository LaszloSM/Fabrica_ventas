'use client'
import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'

interface VariablePreviewProps {
  template: { name: string; subject?: string | null; body: string }
  open: boolean
  onClose: () => void
}

function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{(\w+)\}\}/g) || []
  return [...new Set(matches.map((m) => m.replace(/[{}]/g, '')))]
}

function interpolate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || `{{${k}}}`)
}

export function VariablePreview({ template, open, onClose }: VariablePreviewProps) {
  const variables = useMemo(() => extractVariables(template.body + (template.subject || '')), [template])
  const [values, setValues] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState(false)

  const preview = interpolate(template.body, values)

  async function handleCopy() {
    await navigator.clipboard.writeText(preview)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-[#1a1a2e]/95 border-white/10 backdrop-blur-xl">
        <DialogHeader><DialogTitle className="text-white">{template.name}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold mb-3 text-white/60">Variables</h4>
            <div className="space-y-3">
              {variables.map((v) => (
                <div key={v}>
                  <Label className="text-xs text-white/40">{`{{${v}}}`}</Label>
                  <Input
                    value={values[v] || ''}
                    onChange={(e) => setValues({ ...values, [v]: e.target.value })}
                    placeholder={v}
                    className="mt-1 text-sm border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-[#f26522]/50"
                  />
                </div>
              ))}
              {variables.length === 0 && <p className="text-sm text-white/30">Sin variables</p>}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3 text-white/60">Vista previa</h4>
            <div className="bg-white/5 rounded-xl p-3 text-sm whitespace-pre-wrap min-h-[200px] border border-white/10 text-white/70">
              {preview}
            </div>
            <Button onClick={handleCopy} variant="outline" className="w-full mt-3 border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white">
              {copied ? <><Check className="w-4 h-4 mr-2" />¡Copiado!</> : <><Copy className="w-4 h-4 mr-2" />Copiar mensaje</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
