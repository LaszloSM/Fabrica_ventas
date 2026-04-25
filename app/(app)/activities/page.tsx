'use client'
import { TodayQueue } from '@/components/activities/TodayQueue'

export default function ActivitiesPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Actividades</h1>
        <p className="text-white/50 mt-1">Tus tareas diarias y registro de interacciones</p>
      </div>
      <TodayQueue />
    </div>
  )
}
