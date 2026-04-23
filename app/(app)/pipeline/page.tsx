import { KanbanBoard } from '@/components/pipeline/KanbanBoard'

export default function PipelinePage() {
  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
        <p className="text-gray-500 text-sm mt-1">Arrastra los deals entre etapas</p>
      </div>
      <KanbanBoard />
    </div>
  )
}
