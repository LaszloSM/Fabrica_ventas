'use client'
import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, Briefcase, Moon, Sun, Database, Loader2, RefreshCw } from 'lucide-react'
import { TeamSettings } from '@/components/settings/TeamSettings'
import { UserSettings } from '@/components/settings/UserSettings'
import { useTheme } from '@/components/theme/ThemeProvider'
import { Button } from '@/components/ui/button'
import { useSession } from 'next-auth/react'

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  return (
    <div className="p-7 max-w-5xl mx-auto">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold text-white/40 uppercase tracking-[0.08em] mb-1.5">Sistema</p>
          <h1 className="text-[32px] font-normal text-white leading-tight" style={{ fontFamily: 'var(--font-dm-serif), Georgia, serif' }}>Configuración</h1>
          <p className="text-sm text-white/50 mt-1">Gestiona usuarios, equipo y preferencias</p>
        </div>
        <Button
          variant="outline"
          onClick={toggleTheme}
          className="flex items-center gap-2 text-white/60 border-white/10 bg-white/5 hover:bg-white/10 hover:text-white"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-[#f26522]" />
              Modo claro
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-white/60" />
              Modo oscuro
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="team" className="space-y-6">
        <TabsList className="bg-white/5 border border-white/10 p-1">
          <TabsTrigger
            value="team"
            className="flex items-center gap-2 text-xs data-[state=active]:bg-white/10 data-[state=active]:text-[#f26522] text-white/50 rounded-lg transition-all"
          >
            <Briefcase className="w-4 h-4" />
            Equipo de Ventas
          </TabsTrigger>
          <TabsTrigger
            value="users"
            className="flex items-center gap-2 text-xs data-[state=active]:bg-white/10 data-[state=active]:text-[#f26522] text-white/50 rounded-lg transition-all"
          >
            <Users className="w-4 h-4" />
            Usuarios del Sistema
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger
              value="data"
              className="flex items-center gap-2 text-xs data-[state=active]:bg-white/10 data-[state=active]:text-[#f26522] text-white/50 rounded-lg transition-all"
            >
              <Database className="w-4 h-4" />
              Datos
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="team">
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
            <TeamSettings />
          </div>
        </TabsContent>

        <TabsContent value="users">
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
            <UserSettings />
          </div>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="data">
            <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
              <h2 className="text-lg font-semibold text-white mb-1">Base de Datos</h2>
              <p className="text-sm text-white/50 mb-6">
                Sincroniza los contactos del Google Sheet de CoimpactoB. La sincronización hace upsert — no borra datos registrados manualmente.
              </p>
              <SyncDataPanel />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

function SyncDataPanel() {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSync() {
    if (!confirm('¿Sincronizar datos desde Google Sheets? Se actualizarán los contactos existentes y se crearán los nuevos.')) return
    setSyncing(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/import/from-sheets', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) setError(json.detail || 'Error al sincronizar')
      else setResult(json.data)
    } catch {
      setError('No se pudo conectar al servidor')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleSync}
        disabled={syncing}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 text-sm font-medium transition-all disabled:opacity-50"
      >
        {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        {syncing ? 'Sincronizando...' : 'Sincronizar desde Google Sheets'}
      </button>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {result && (
        <div className="grid grid-cols-3 gap-3 text-sm">
          {[
            ['Prospectos', result.prospects],
            ['Contactos', result.contacts],
            ['Deals', result.deals],
            ['Actividades', result.activities],
            ['Filas procesadas', result.rows_processed],
            ['Duplicados omitidos', result.duplicates_skipped],
          ].map(([label, val]) => (
            <div key={label as string} className="bg-white/5 rounded-lg p-3">
              <p className="text-white/40 text-xs">{label}</p>
              <p className="text-white font-bold text-xl">{val ?? 0}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
