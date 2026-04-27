import React from 'react'
import { Filter, Download } from 'lucide-react'
import { KanbanBoard } from '../components/pipeline/KanbanBoard'

interface Props { onDealClick: (id: string) => void }

export function PipelineView({ onDealClick }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-on-surface">Pipeline de Ventas</h2>
          <p className="text-on-surface-variant mt-1">Visualiza y gestiona las etapas de impacto.</p>
        </div>
        <div className="flex gap-2">
          <button className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container text-on-surface-variant">
            <Filter size={18} />
          </button>
          <a
            href="/api/reports/pipeline"
            className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container text-on-surface-variant flex items-center"
          >
            <Download size={18} />
          </a>
        </div>
      </header>
      <KanbanBoard onDealClick={onDealClick} />
    </div>
  )
}
