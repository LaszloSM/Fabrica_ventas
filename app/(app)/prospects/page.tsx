'use client'
import { useState } from 'react'
import { ProspectList } from '@/components/prospects/ProspectList'
import { ProspectForm } from '@/components/prospects/ProspectForm'
import { ImportModal } from '@/components/prospects/ImportModal'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

export default function ProspectsPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Prospectos</h1>
          <p className="text-sm text-white/50 mt-1">Gestión de empresas y contactos objetivo</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setImportOpen(true)}
          className="flex items-center gap-2 text-emerald-400 border-emerald-400/30 bg-white/5 hover:bg-emerald-400/10 hover:text-emerald-300"
        >
          <Download className="w-4 h-4" />
          Importar Google Sheets
        </Button>
      </div>
      <ProspectList key={refreshKey} onCreateNew={() => setCreateOpen(true)} />
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#1a1a2e]/95 border-white/10 backdrop-blur-xl">
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
