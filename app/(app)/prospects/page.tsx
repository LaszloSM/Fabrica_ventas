'use client'
import { useState } from 'react'
import { ProspectList } from '@/components/prospects/ProspectList'
import { ProspectForm } from '@/components/prospects/ProspectForm'
import { ImportModal } from '@/components/prospects/ImportModal'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Download } from 'lucide-react'

export default function ProspectsPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="p-7 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div>
          <p className="text-[11px] font-semibold text-white/40 uppercase tracking-[0.08em] mb-1.5">Base de datos</p>
          <h1 className="text-[32px] font-normal text-white leading-tight" style={{ fontFamily: 'var(--font-dm-serif), Georgia, serif' }}>Prospectos</h1>
        </div>
        <button
          onClick={() => setImportOpen(true)}
          className="flex items-center gap-2 text-[13px] text-emerald-400 border border-emerald-400/20 bg-white/[0.03] hover:bg-emerald-400/[0.08] hover:text-emerald-300 h-9 px-3.5 rounded-lg transition-all duration-200"
        >
          <Download className="w-4 h-4" />
          Importar Google Sheets
        </button>
      </div>

      <ProspectList key={refreshKey} onCreateNew={() => setCreateOpen(true)} />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#0e0e1c]/95 border-white/10 backdrop-blur-xl">
          <DialogHeader><DialogTitle className="text-white">Nuevo Prospecto</DialogTitle></DialogHeader>
          <ProspectForm onSuccess={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onDone={() => { setImportOpen(false); setRefreshKey(k => k + 1) }}
      />
    </div>
  )
}
