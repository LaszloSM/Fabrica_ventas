import { KanbanBoard } from '@/components/pipeline/KanbanBoard'
import { Kanban } from 'lucide-react'

export default function PipelinePage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex items-end justify-between px-7 py-5 flex-shrink-0">
        <div>
          <p className="text-[11px] font-semibold text-white/40 uppercase tracking-[0.08em] mb-1">Ventas</p>
          <h1 className="text-[32px] font-normal text-white leading-tight" style={{ fontFamily: 'var(--font-dm-serif), Georgia, serif' }}>Pipeline</h1>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-auto px-6 pt-2">
        <KanbanBoard />
      </div>
    </div>
  )
}
