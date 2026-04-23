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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{template.name}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold mb-3 text-gray-700">Variables</h4>
            <div className="space-y-3">
              {variables.map((v) => (
                <div key={v}>
                  <Label className="text-xs text-gray-500">{`{{${v}}}`}</Label>
                  <Input
                    value={values[v] || ''}
                    onChange={(e) => setValues({ ...values, [v]: e.target.value })}
                    placeholder={v}
                    className="mt-1 text-sm"
                  />
                </div>
              ))}
              {variables.length === 0 && <p className="text-sm text-gray-400">Sin variables</p>}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3 text-gray-700">Vista previa</h4>
            <div className="bg-gray-50 rounded-lg p-3 text-sm whitespace-pre-wrap min-h-[200px] border">
              {preview}
            </div>
            <Button onClick={handleCopy} className="w-full mt-3" variant="outline">
              {copied ? <><Check className="w-4 h-4 mr-2" />¡Copiado!</> : <><Copy className="w-4 h-4 mr-2" />Copiar mensaje</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
