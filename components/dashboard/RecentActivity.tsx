'use client'
import { useEffect, useState } from 'react'
import { Calendar, CheckCircle, Mail, Phone, User, FileText } from 'lucide-react'
import type { Activity } from '@/types'

const typeIcons: Record<string, React.ElementType> = {
  EMAIL: Mail,
  CALL: Phone,
  MEETING: User,
  NOTE: FileText,
  LINKEDIN: CheckCircle,
}

const typeColors: Record<string, string> = {
  EMAIL: '#60a5fa',
  CALL: '#34d399',
  MEETING: '#f26522',
  NOTE: '#fbbf24',
  LINKEDIN: '#818cf8',
}

export function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/activities?limit=5')
      .then((r) => r.json())
      .then((j) => {
        setActivities(j.data || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-6">
        <FileText className="mx-auto h-8 w-8 text-white/10 mb-2" />
        <p className="text-sm text-white/40">No hay actividades recientes</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => {
        const Icon = typeIcons[activity.type] || CheckCircle
        const color = typeColors[activity.type] || '#64748B'
        const date = activity.doneAt
          ? new Date(activity.doneAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
          : ''

        return (
          <div
            key={activity.id}
            className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition-all hover:border-white/20 hover:bg-white/[0.07]"
          >
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: color + '20' }}
            >
              <Icon className="h-4 w-4" style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">
                {activity.type}
                {activity.prospect && (
                  <span className="text-white/50"> · {activity.prospect.name}</span>
                )}
              </p>
              {activity.notes && (
                <p className="text-xs text-white/40 truncate">{activity.notes}</p>
              )}
            </div>
            {date && (
              <div className="flex items-center gap-1 text-[10px] text-white/30 flex-shrink-0">
                <Calendar className="h-3 w-3" />
                {date}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
