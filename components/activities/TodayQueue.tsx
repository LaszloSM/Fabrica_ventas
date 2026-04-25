'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar, AlertCircle, CheckCircle } from 'lucide-react'
import { ActivityForm } from './ActivityForm'

export function TodayQueue() {
  const [tasks, setTasks] = useState<{ id: string, prospectId: string, name: string, type: string, date: string, isSequence: boolean }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadQueue() {
      const res = await fetch('/api/sequences')
      const json = await res.json()
      const sequences = json.data || []
      
      const queue: { id: string, prospectId: string, name: string, type: string, date: string, isSequence: boolean }[] = []
      const today = new Date().toISOString().split('T')[0]

      sequences.forEach((seq: any) => {
        const nextStep = seq.steps.find((s: any) => !s.sentAt)
        if (nextStep && nextStep.scheduledAt.startsWith(today)) {
          queue.push({
            id: nextStep.id,
            prospectId: seq.prospectId,
            name: seq.prospect.name,
            type: nextStep.type,
            date: nextStep.scheduledAt,
            isSequence: true
          })
        }
      })

      setTasks(queue)
      setLoading(false)
    }
    loadQueue()
  }, [])

  if (loading) return <div className="text-center py-8 text-white/40">Cargando cola de hoy...</div>

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-semibold text-white">Tareas de Hoy</h2>
        </div>

        {tasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-8 text-center">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-white/10" />
            <p className="text-sm text-white/40">¡Estás al día! No hay tareas pendientes para hoy.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-3 transition-all hover:border-white/20 hover:bg-white/[0.07]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{task.name}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] bg-white/10 text-white/50 border-0">{task.type}</Badge>
                      <span className="text-[10px] text-white/30">{task.isSequence ? 'Secuencia' : 'Seguimiento'}</span>
                    </div>
                  </div>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline" className="text-xs border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white">Registrar</Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 bg-[#1a1a2e] border-white/10">
                    <ActivityForm 
                      prospectId={task.prospectId} 
                      onSuccess={() => {}} 
                    />
                  </PopoverContent>
                </Popover>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
