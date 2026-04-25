'use client'
import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, Briefcase, Moon, Sun } from 'lucide-react'
import { TeamSettings } from '@/components/settings/TeamSettings'
import { UserSettings } from '@/components/settings/UserSettings'
import { useTheme } from '@/components/theme/ThemeProvider'
import { Button } from '@/components/ui/button'

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme()

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
      </Tabs>
    </div>
  )
}
