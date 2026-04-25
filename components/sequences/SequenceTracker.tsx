'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, CheckCircle2, Pause, Play, XCircle, GitBranch } from 'lucide-react'
import type { SequenceWithRelations } from '@/types'
import { StepOutcome, SequenceStatus } from '@/types'

interface SequenceTrackerProps {
  sequences: SequenceWithRelations[]
}

export function SequenceTracker({ sequences }: SequenceTrackerProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  async function updateStep(sequenceId: string, stepNumber: number, outcome: StepOutcome) {
    await fetch(`/api/sequences/${sequenceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stepNumber, outcome }),
    })
    setRefreshTrigger(prev => prev + 1)
  }

  async function updateStatus(sequenceId: string, status: SequenceStatus) {
    await fetch(`/api/sequences/${sequenceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setRefreshTrigger(prev => prev + 1)
  }

  if (sequences.length === 0) {
    return (
      <div className="text-center py-12">
        <GitBranch className="mx-auto h-8 w-8 text-white/10 mb-2" />
        <p className="text-sm text-white/40">No hay secuencias activas. Crea la primera.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {sequences.map((seq) => {
        const completedSteps = seq.steps.filter(s => s.outcome).length
        const totalSteps = seq.steps.length
        const progress = (completedSteps / totalSteps) * 100
        const nextStep = seq.steps.find(s => !s.outcome)

        return (
          <div key={seq.id} className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden transition-all hover:border-white/20">
            <div className="p-4 flex flex-row items-center justify-between space-y-0 border-b border-white/10">
              <div>
                <h3 className="text-base font-semibold text-white">{seq.prospect.name}</h3>
                <p className="text-xs text-white/40">{seq.templateSequence?.name || 'Secuencia Personalizada'}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => updateStatus(seq.id, 'PAUSED')} disabled={seq.status === 'PAUSED'} className="border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white">
                  <Pause className="w-3 h-3 mr-1" /> Pausar
                </Button>
                <Button variant="outline" size="sm" onClick={() => updateStatus(seq.id, 'ACTIVE')} disabled={seq.status === 'ACTIVE'} className="border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white">
                  <Play className="w-3 h-3 mr-1" /> Reanudar
                </Button>
                <Button size="sm" onClick={() => updateStatus(seq.id, 'COMPLETED')} className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-0">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Finalizar
                </Button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium text-white/60">
                  <span>Progreso: {completedSteps} / {totalSteps}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2 bg-white/10" />
              </div>

              {nextStep ? (
                <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-400/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 rounded-full text-emerald-400">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-emerald-400">Próximo paso: {nextStep.type}</p>
                      <p className="text-[10px] text-emerald-300/60">Programado para: {new Date(nextStep.scheduledAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Select onValueChange={(v) => updateStep(seq.id, nextStep.stepNumber, v as StepOutcome)}>
                      <SelectTrigger className="h-8 text-xs w-[140px] border-white/10 bg-white/5 text-white">
                        <SelectValue placeholder="Marcar resultado" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a2e] border-white/10">
                        <SelectItem value={StepOutcome.REPLIED}>Respondido</SelectItem>
                        <SelectItem value={StepOutcome.NO_REPLY}>Sin respuesta</SelectItem>
                        <SelectItem value={StepOutcome.BOUNCED}>Rebotado</SelectItem>
                        <SelectItem value={StepOutcome.MEETING_BOOKED}>Reunión agendada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-white/30 italic">
                  Todos los pasos completados
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
