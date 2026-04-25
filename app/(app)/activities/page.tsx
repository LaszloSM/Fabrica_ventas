'use client'
import { TodayQueue } from '@/components/activities/TodayQueue'

export default function ActivitiesPage() {
  return (
    <div className="p-7 max-w-4xl mx-auto">
      <div className="mb-6">
        <p className="text-[11px] font-semibold text-white/40 uppercase tracking-[0.08em] mb-1.5">Tareas</p>
        <h1 className="text-[32px] font-normal text-white leading-tight" style={{ fontFamily: 'var(--font-dm-serif), Georgia, serif' }}>Actividades</h1>
        <p className="text-sm text-white/50 mt-1">Tus tareas diarias y registro de interacciones</p>
      </div>
      <TodayQueue />
    </div>
  )
}
