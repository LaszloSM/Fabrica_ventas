'use client'
import { useEffect, useState } from 'react'
import { Calendar, CheckCircle, Mail, Phone, User, FileText } from 'lucide-react'
import { colors, shadows } from '@/lib/design-system'
import type { Activity } from '@/types'

const typeIcons: Record<string, React.ElementType> = {
  EMAIL: Mail,
  CALL: Phone,
  MEETING: User,
  NOTE: FileText,
  LINKEDIN: CheckCircle,
}

const typeColors: Record<string, string> = {
  EMAIL: colors.info,
  CALL: colors.success,
  MEETING: colors.primary,
  NOTE: colors.warning,
  LINKEDIN: colors.cold,
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
          <div key={i} className="h-12 animate-pulse rounded-lg bg-[#F1F5F9]" />
        ))}
      </div>
    )
  }

  if (activities.length === 0) {
    return <p className="text-sm text-[#94A3B8]">No hay actividades recientes</p>
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => {
        const Icon = typeIcons[activity.type] || CheckCircle
        const color = typeColors[activity.type] || colors.cold
        const date = activity.doneAt
          ? new Date(activity.doneAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
          : ''

        return (
          <div
            key={activity.id}
            className="flex items-start gap-3 rounded-lg border border-[#E2E8F0] bg-white p-3 transition-all hover:shadow-sm"
            style={{ boxShadow: shadows.sm }}
          >
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${color}15` }}
            >
              <Icon className="h-4 w-4" style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#1E293B]">
                {activity.type}
                {activity.prospect && (
                  <span className="text-[#64748B]"> · {activity.prospect.name}</span>
                )}
              </p>
              {activity.notes && (
                <p className="text-xs text-[#64748B] truncate">{activity.notes}</p>
              )}
            </div>
            {date && (
              <div className="flex items-center gap-1 text-[10px] text-[#94A3B8]">
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
