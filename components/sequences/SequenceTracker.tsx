'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, CheckCircle2, Pause, Play, XCircle } from 'lucide-react'
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

  return (
    <div className="grid gap-4">
      {sequences.map((seq) => {
        const completedSteps = seq.steps.filter(s => s.outcome).length
        const totalSteps = seq.steps.length
        const progress = (completedSteps / totalSteps) * 100
        const nextStep = seq.steps.find(s => !s.outcome)

        return (
          <Card key={seq.id} className="overflow-hidden">
            <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">{seq.prospect.name}</CardTitle>
                <p className="text-xs text-gray-500">{seq.templateSequence?.name || 'Secuencia Personalizada'}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => updateStatus(seq.id, 'PAUSED')} disabled={seq.status === 'PAUSED'}>
                  <Pause className="w-3 h-3 mr-1" /> Pausar
                </Button>
                <Button variant="outline" size="sm" onClick={() => updateStatus(seq.id, 'ACTIVE')} disabled={seq.status === 'ACTIVE'}>
                  <Play className="w-3 h-3 mr-1" /> Reanudar
                </Button>
                <Button variant="destructive" size="sm" onClick={() => updateStatus(seq.id, 'COMPLETED')}>
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Finalizar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span>Progreso: {completedSteps} / {totalSteps}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {nextStep ? (
                <div className="bg-green-50 p-3 rounded-lg border border-green-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-full text-green-600">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-green-800">Próximo paso: {nextStep.type}</p>
                      <p className="text-[10px] text-green-600">Programado para: {new Date(nextStep.scheduledAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Select onValueChange={(v) => updateStep(seq.id, nextStep.stepNumber, v as StepOutcome)}>
                      <SelectTrigger className="h-8 text-xs w-[140px]">
                        <SelectValue placeholder="Marcar resultado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={StepOutcome.REPLIED}>Respondido</SelectItem>
                        <SelectItem value={StepOutcome.NO_REPLY}>Sin respuesta</SelectItem>
                        <SelectItem value={StepOutcome.BOUNCED}>Rebotado</SelectItem>
                        <SelectItem value={StepOutcome.MEETING_BOOKED}>Reunión agendada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-gray-400 italic">
                  Todos los pasos completados
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
