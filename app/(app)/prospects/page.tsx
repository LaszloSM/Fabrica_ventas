'use client'
import { useState } from 'react'
import { ProspectList } from '@/components/prospects/ProspectList'
import { ProspectForm } from '@/components/prospects/ProspectForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function ProspectsPage() {
  const [open, setOpen] = useState(false)
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Prospectos</h1>
        <p className="text-gray-500 mt-1">Gestión de empresas y contactos objetivo</p>
      </div>
      <ProspectList onCreateNew={() => setOpen(true)} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo Prospecto</DialogTitle></DialogHeader>
          <ProspectForm onSuccess={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
