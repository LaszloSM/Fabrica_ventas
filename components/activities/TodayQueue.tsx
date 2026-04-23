'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Calendar, AlertCircle, CheckCircle } from 'lucide-react'
import { ActivityForm } from './ActivityForm'

export function TodayQueue() {
  const [tasks, setTasks] = useState<{ id: string, prospectId: string, name: string, type: string, date: string, isSequence: boolean }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadQueue() {
      // In a real app, we'd have a specialized endpoint for the queue.
      // For now, let's mock some tasks based on sequences and overdue deals.
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

  if (loading) return <div className="text-center py-8 text-gray-400">Cargando cola de hoy...</div>

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-semibold">Tareas de Hoy</h2>
        </div>

        {tasks.length === 0 ? (
          <div className="bg-gray-50 border border-dashed rounded-xl p-8 text-center text-gray-400">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>¡Estás al día! No hay tareas pendientes para hoy.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {tasks.map((task) => (
              <Card key={task.id} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{task.name}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">{task.type}</Badge>
                      <span className="text-[10px] text-gray-400">{task.isSequence ? 'Secuencia' : 'Seguimiento'}</span>
                    </div>
                  </div>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline" className="text-xs">Registrar</Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <ActivityForm 
                      prospectId={task.prospectId} 
                      onSuccess={() => {}} 
                    />
                  </PopoverContent>
                </Popover>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
