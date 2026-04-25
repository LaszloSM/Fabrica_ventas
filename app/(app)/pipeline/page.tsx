import { KanbanBoard } from '@/components/pipeline/KanbanBoard'
import { Kanban } from 'lucide-react'

export default function PipelinePage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(242,101,34,0.12)] border border-[rgba(242,101,34,0.2)]">
            <Kanban className="w-4 h-4 text-[#f26522]" />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold text-white leading-tight">Pipeline</h1>
            <p className="text-[11px] text-white/35 leading-tight">Gestión de oportunidades</p>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-auto px-6 pt-4">
        <KanbanBoard />
      </div>
    </div>
  )
}
