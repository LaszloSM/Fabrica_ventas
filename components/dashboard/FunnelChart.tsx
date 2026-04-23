'use client'
import { FunnelChart as RechartsFunnel, Funnel, Tooltip, LabelList, ResponsiveContainer } from 'recharts'

interface FunnelData { stage: string; count: number }

const STAGE_LABELS: Record<string, string> = {
  PROSPECTO_IDENTIFICADO: 'Prospectos',
  PRIMER_CONTACTO:        'Contactados',
  REUNION_AGENDADA:       'Reuniones',
  PROPUESTA_ENVIADA:      'Propuestas',
  GANADO:                 'Cerrados',
}

export function FunnelChart({ data }: { data: FunnelData[] }) {
  const formatted = data.map((d) => ({ name: STAGE_LABELS[d.stage] || d.stage, value: d.count }))
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsFunnel data={formatted} dataKey="value">
          <Tooltip />
          <LabelList position="center" fill="#fff" stroke="none" />
        </RechartsFunnel>
      </ResponsiveContainer>
    </div>
  )
}
